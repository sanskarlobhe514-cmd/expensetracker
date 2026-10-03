const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply admin protection to all routes in this file
router.use(authenticateToken, requireAdmin);

// GET /api/admin/statistics - Overview statistics for Admin Dashboard
router.get('/statistics', async (req, res) => {
  try {
    const totalUsersRow = await db.getAsync(`SELECT COUNT(*) as count FROM users WHERE role != 'admin'`);
    const totalAdminsRow = await db.getAsync(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
    const totalExpensesRow = await db.getAsync(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalAmount FROM expenses`);
    const totalIncomeRow = await db.getAsync(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalAmount FROM income`);
    const totalCategoriesRow = await db.getAsync(`SELECT COUNT(*) as count FROM categories`);

    // Current month volume
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthExpensesRow = await db.getAsync(`
      SELECT COALESCE(SUM(amount), 0) as totalAmount 
      FROM expenses 
      WHERE strftime('%Y-%m', date) = ?
    `, [currentMonth]);

    res.json({
      totalUsers: totalUsersRow ? totalUsersRow.count : 0,
      totalAdmins: totalAdminsRow ? totalAdminsRow.count : 0,
      totalExpensesCount: totalExpensesRow ? totalExpensesRow.count : 0,
      totalExpensesAmount: totalExpensesRow ? totalExpensesRow.totalAmount : 0,
      totalIncomeCount: totalIncomeRow ? totalIncomeRow.count : 0,
      totalIncomeAmount: totalIncomeRow ? totalIncomeRow.totalAmount : 0,
      totalCategories: totalCategoriesRow ? totalCategoriesRow.count : 0,
      currentMonthExpensesAmount: monthExpensesRow ? monthExpensesRow.totalAmount : 0
    });
  } catch (err) {
    console.error('Admin statistics error:', err);
    res.status(500).json({ error: 'Failed to retrieve admin statistics.' });
  }
});

// GET /api/admin/users - List all registered users with metrics
router.get('/users', async (req, res) => {
  try {
    const users = await db.allAsync(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        COUNT(DISTINCT e.id) as expense_count,
        COALESCE(SUM(e.amount), 0) as total_expenses,
        COUNT(DISTINCT i.id) as income_count,
        COALESCE(SUM(i.amount), 0) as total_income
      FROM users u
      LEFT JOIN expenses e ON e.user_id = u.id
      LEFT JOIN income i ON i.user_id = u.id
      GROUP BY u.id
      ORDER BY u.id ASC
    `);

    res.json({ users });
  } catch (err) {
    console.error('Admin fetch users error:', err);
    res.status(500).json({ error: 'Failed to retrieve users list.' });
  }
});

// DELETE /api/admin/users/:id - Delete a user and cascade their data
router.delete('/users/:id', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);

    // Prevent admin from deleting themselves
    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }

    const user = await db.getAsync('SELECT id, name, email, role FROM users WHERE id = ?', [targetUserId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await db.runAsync('DELETE FROM users WHERE id = ?', [targetUserId]);

    res.json({ message: `User "${user.name}" and all associated financial records were deleted.` });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// GET /api/admin/expenses - View all expenses across all users
router.get('/expenses', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20, sortBy = 'date', sortOrder = 'DESC' } = req.query;

    const conditions = [];
    const params = [];

    if (search && search.trim() !== '') {
      conditions.push('(e.title LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR e.description LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category && category !== 'All') {
      conditions.push('c.name = ?');
      params.push(category);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const summarySql = `
      SELECT COUNT(*) as count, COALESCE(SUM(e.amount), 0) as totalAmount
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      JOIN categories c ON e.category_id = c.id
      ${whereClause}
    `;
    const summary = await db.getAsync(summarySql, params);

    const validSortCols = {
      date: 'e.date',
      amount: 'e.amount',
      title: 'e.title',
      user: 'u.name'
    };
    const sortCol = validSortCols[sortBy] || 'e.date';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    const listSql = `
      SELECT 
        e.id,
        e.title,
        e.amount,
        e.date,
        e.payment_method,
        e.description,
        e.receipt_url,
        e.created_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM expenses e
      JOIN users u ON e.user_id = u.id
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
    console.error('Admin fetch expenses error:', err);
    res.status(500).json({ error: 'Failed to retrieve system expenses.' });
  }
});

// DELETE /api/admin/expenses/:id - Admin deletes inappropriate/incorrect expense
router.delete('/expenses/:id', async (req, res) => {
  try {
    const expenseId = req.params.id;

    const existing = await db.getAsync('SELECT id, title, amount FROM expenses WHERE id = ?', [expenseId]);
    if (!existing) {
      return res.status(404).json({ error: 'Expense record not found.' });
    }

    await db.runAsync('DELETE FROM expenses WHERE id = ?', [expenseId]);

    res.json({ message: `Expense record #${expenseId} ("${existing.title}") deleted by Admin.` });
  } catch (err) {
    console.error('Admin delete expense error:', err);
    res.status(500).json({ error: 'Failed to delete expense record.' });
  }
});

// GET /api/admin/analytics - System-wide analytics and charts data
router.get('/analytics', async (req, res) => {
  try {
    // 1. System category distribution
    const categoryStats = await db.allAsync(`
      SELECT 
        c.name, 
        c.color,
        COUNT(e.id) as count, 
        COALESCE(SUM(e.amount), 0) as total
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id
      GROUP BY c.id
      ORDER BY total DESC
    `);

    // 2. System monthly volume
    const monthlyVolume = await db.allAsync(`
      SELECT 
        strftime('%Y-%m', date) as month,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as expenses
      FROM expenses
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12
    `);

    // 3. System payment methods
    const paymentStats = await db.allAsync(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM expenses
      GROUP BY payment_method
      ORDER BY total DESC
    `);

    res.json({
      categoryStats,
      monthlyVolume,
      paymentStats
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ error: 'Failed to retrieve analytics.' });
  }
});

module.exports = router;
