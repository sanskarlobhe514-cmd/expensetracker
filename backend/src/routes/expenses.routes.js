const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// Setup multer storage for receipts
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `receipt_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|pdf/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (allowed.test(ext) || allowed.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP) and PDFs are allowed as receipts.'));
    }
  }
});

// Category keyword suggestion map
const CATEGORY_KEYWORDS = {
  Food: ['food', 'restaurant', 'cafe', 'coffee', 'starbucks', 'swiggy', 'zomato', 'dominos', 'pizza', 'burger', 'lunch', 'dinner', 'breakfast', 'grocery', 'groceries', 'supermarket', 'blinkit', 'zepto', 'instamart', 'snack', 'dining'],
  Travel: ['uber', 'ola', 'taxi', 'cab', 'metro', 'irctc', 'train', 'flight', 'indigo', 'petrol', 'diesel', 'fuel', 'toll', 'bus', 'auto', 'commute', 'transit'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'electronics', 'mall', 'zara', 'h&m', 'apparel', 'shopping', 'store', 'purchase'],
  Education: ['course', 'udemy', 'coursera', 'tuition', 'fee', 'fees', 'book', 'books', 'college', 'exam', 'training', 'classes', 'school'],
  Bills: ['electricity', 'water', 'gas', 'broadband', 'wifi', 'recharge', 'mobile', 'airtel', 'jio', 'bill', 'utility', 'broadband', 'power'],
  Healthcare: ['doctor', 'hospital', 'clinic', 'pharmacy', 'medicine', 'medicines', 'medical', 'lab', 'dental', 'health', 'consultation'],
  Entertainment: ['netflix', 'spotify', 'cinema', 'movie', 'pvr', 'concert', 'game', 'gaming', 'pub', 'club', 'show', 'theater', 'hotstar'],
  Rent: ['rent', 'flat', 'apartment', 'maintenance', 'society', 'room', 'hostel']
};

// Smart Category Suggestion endpoint
router.get('/suggest-category', authenticateToken, async (req, res) => {
  try {
    const { title } = req.query;
    if (!title || typeof title !== 'string') {
      return res.json({ suggestedCategory: null });
    }

    const lower = title.toLowerCase();
    let matchedName = null;

    for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k))) {
        matchedName = catName;
        break;
      }
    }

    if (matchedName) {
      const cat = await db.getAsync(
        'SELECT id, name, icon, color FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [matchedName]
      );
      if (cat) {
        return res.json({ suggestedCategory: cat.name, category: cat });
      }
    }

    res.json({ suggestedCategory: null });
  } catch (err) {
    console.error('Suggest category error:', err);
    res.status(500).json({ error: 'Failed to suggest category.' });
  }
});

// GET /api/expenses - List user expenses with filters, search, sorting and pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      category_id,
      category,
      startDate,
      endDate,
      paymentMethod,
      search,
      sortBy = 'date',
      sortOrder = 'DESC',
      page = 1,
      limit = 20
    } = req.query;

    const conditions = ['e.user_id = ?'];
    const params = [userId];

    if (category_id) {
      conditions.push('e.category_id = ?');
      params.push(Number(category_id));
    } else if (category) {
      conditions.push('LOWER(c.name) = LOWER(?)');
      params.push(category);
    }

    if (startDate) {
      conditions.push('e.date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('e.date <= ?');
      params.push(endDate);
    }

    if (paymentMethod && paymentMethod !== 'All') {
      conditions.push('e.payment_method = ?');
      params.push(paymentMethod);
    }

    if (search && search.trim() !== '') {
      conditions.push('(e.title LIKE ? OR e.description LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Calculate total summary amount & count
    const summarySql = `
      SELECT COUNT(*) as count, COALESCE(SUM(e.amount), 0) as totalAmount
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      ${whereClause}
    `;
    const summary = await db.getAsync(summarySql, params);

    // Order By
    const validSortCols = {
      date: 'e.date',
      amount: 'e.amount',
      title: 'e.title',
      category: 'c.name'
    };
    const sortCol = validSortCols[sortBy] || 'e.date';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = parseInt(limit, 10) === 0 ? summary.count : Math.max(1, parseInt(limit, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    const listSql = `
      SELECT 
        e.id,
        e.user_id,
        e.category_id,
        e.title,
        e.amount,
        e.date,
        e.payment_method,
        e.description,
        e.receipt_url,
        e.created_at,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      ${whereClause}
      ORDER BY ${sortCol} ${direction}, e.id DESC
      LIMIT ? OFFSET ?
    `;

    const expenses = await db.allAsync(listSql, [...params, limitNum, offset]);

    res.json({
      expenses,
      summary: {
        totalAmount: summary.totalAmount,
        count: summary.count
      },
      pagination: {
        total: summary.count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(summary.count / limitNum) || 1
      }
    });
  } catch (err) {
    console.error('Fetch expenses error:', err);
    res.status(500).json({ error: 'Failed to retrieve expenses.' });
  }
});

// GET /api/expenses/:id - Single expense
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await db.getAsync(`
      SELECT 
        e.id,
        e.user_id,
        e.category_id,
        e.title,
        e.amount,
        e.date,
        e.payment_method,
        e.description,
        e.receipt_url,
        e.created_at,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.id = ? AND e.user_id = ?
    `, [req.params.id, req.user.id]);

    if (!expense) {
      return res.status(404).json({ error: 'Expense record not found.' });
    }

    res.json({ expense });
  } catch (err) {
    console.error('Fetch single expense error:', err);
    res.status(500).json({ error: 'Failed to retrieve expense record.' });
  }
});

// POST /api/expenses - Add new expense
router.post('/', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, amount, category_id, date, payment_method, description } = req.body;

    if (!title || !amount || !category_id || !date || !payment_method) {
      return res.status(400).json({ error: 'Title, amount, category, date, and payment method are required.' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive expense amount.' });
    }

    // Verify category exists
    const category = await db.getAsync('SELECT id, name FROM categories WHERE id = ?', [category_id]);
    if (!category) {
      return res.status(400).json({ error: 'Selected category does not exist.' });
    }

    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Check for spending anomaly (e.g. amount is > 2.5x the user's average in this category)
    const avgStats = await db.getAsync(`
      SELECT AVG(amount) as avgAmount, COUNT(*) as count 
      FROM expenses 
      WHERE user_id = ? AND category_id = ?
    `, [userId, category_id]);

    let anomalyNotice = null;
    if (avgStats && avgStats.count >= 2 && numAmount > avgStats.avgAmount * 2.5) {
      anomalyNotice = `Note: ₹${numAmount.toLocaleString('en-IN')} is noticeably higher than your average ${category.name} expense (₹${Math.round(avgStats.avgAmount).toLocaleString('en-IN')}).`;
    }

    const insertResult = await db.runAsync(`
      INSERT INTO expenses (user_id, category_id, title, amount, date, payment_method, description, receipt_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      category_id,
      title.trim(),
      numAmount,
      date,
      payment_method,
      description ? description.trim() : null,
      receiptUrl
    ]);

    const createdExpense = await db.getAsync(`
      SELECT 
        e.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `, [insertResult.lastID]);

    res.status(201).json({
      message: 'Expense added successfully!',
      expense: createdExpense,
      anomalyNotice
    });
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Failed to record expense. Please try again.' });
  }
});

// PUT /api/expenses/:id - Edit expense
router.put('/:id', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseId = req.params.id;
    const { title, amount, category_id, date, payment_method, description } = req.body;

    const existing = await db.getAsync('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [expenseId, userId]);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found or unauthorized.' });
    }

    const numAmount = amount ? parseFloat(amount) : existing.amount;
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const newCategory = category_id || existing.category_id;
    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : existing.receipt_url;

    await db.runAsync(`
      UPDATE expenses
      SET 
        title = ?,
        amount = ?,
        category_id = ?,
        date = ?,
        payment_method = ?,
        description = ?,
        receipt_url = ?
      WHERE id = ? AND user_id = ?
    `, [
      title ? title.trim() : existing.title,
      numAmount,
      newCategory,
      date || existing.date,
      payment_method || existing.payment_method,
      description !== undefined ? description : existing.description,
      receiptUrl,
      expenseId,
      userId
    ]);

    const updatedExpense = await db.getAsync(`
      SELECT 
        e.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `, [expenseId]);

    res.json({
      message: 'Expense updated successfully!',
      expense: updatedExpense
    });
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Failed to update expense.' });
  }
});

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseId = req.params.id;

    const existing = await db.getAsync('SELECT id FROM expenses WHERE id = ? AND user_id = ?', [expenseId, userId]);
    if (!existing) {
      return res.status(404).json({ error: 'Expense record not found.' });
    }

    await db.runAsync('DELETE FROM expenses WHERE id = ? AND user_id = ?', [expenseId, userId]);

    res.json({ message: 'Expense deleted successfully!' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

module.exports = router;
