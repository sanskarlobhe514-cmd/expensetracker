const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/income - List income with filters and pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      source,
      startDate,
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'DESC',
      page = 1,
      limit = 20
    } = req.query;

    const conditions = ['user_id = ?'];
    const params = [userId];

    if (source && source !== 'All') {
      conditions.push('LOWER(source) = LOWER(?)');
      params.push(source);
    }

    if (startDate) {
      conditions.push('date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('date <= ?');
      params.push(endDate);
    }

    if (search && search.trim() !== '') {
      conditions.push('(source LIKE ? OR description LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total summary
    const summary = await db.getAsync(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalAmount
      FROM income
      ${whereClause}
    `, params);

    const validSortCols = {
      date: 'date',
      amount: 'amount',
      source: 'source'
    };
    const sortCol = validSortCols[sortBy] || 'date';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = parseInt(limit, 10) === 0 ? summary.count : Math.max(1, parseInt(limit, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    const listSql = `
      SELECT id, user_id, source, amount, date, description, created_at
      FROM income
      ${whereClause}
      ORDER BY ${sortCol} ${direction}, id DESC
      LIMIT ? OFFSET ?
    `;

    const incomeList = await db.allAsync(listSql, [...params, limitNum, offset]);

    res.json({
      income: incomeList,
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
    console.error('Fetch income error:', err);
    res.status(500).json({ error: 'Failed to retrieve income records.' });
  }
});

// GET /api/income/:id - Single income record
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await db.getAsync(
      'SELECT * FROM income WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!item) {
      return res.status(404).json({ error: 'Income record not found.' });
    }

    res.json({ income: item });
  } catch (err) {
    console.error('Fetch single income error:', err);
    res.status(500).json({ error: 'Failed to retrieve income record.' });
  }
});

// POST /api/income - Add new income
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { source, amount, date, description } = req.body;

    if (!source || !amount || !date) {
      return res.status(400).json({ error: 'Source, amount, and date are required.' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const result = await db.runAsync(`
      INSERT INTO income (user_id, source, amount, date, description)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, source.trim(), numAmount, date, description ? description.trim() : null]);

    const created = await db.getAsync('SELECT * FROM income WHERE id = ?', [result.lastID]);

    res.status(201).json({
      message: 'Income added successfully!',
      income: created
    });
  } catch (err) {
    console.error('Add income error:', err);
    res.status(500).json({ error: 'Failed to add income record.' });
  }
});

// PUT /api/income/:id - Edit income
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const incomeId = req.params.id;
    const { source, amount, date, description } = req.body;

    const existing = await db.getAsync('SELECT * FROM income WHERE id = ? AND user_id = ?', [incomeId, userId]);
    if (!existing) {
      return res.status(404).json({ error: 'Income record not found.' });
    }

    const numAmount = amount ? parseFloat(amount) : existing.amount;
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    await db.runAsync(`
      UPDATE income
      SET 
        source = ?,
        amount = ?,
        date = ?,
        description = ?
      WHERE id = ? AND user_id = ?
    `, [
      source ? source.trim() : existing.source,
      numAmount,
      date || existing.date,
      description !== undefined ? description : existing.description,
      incomeId,
      userId
    ]);

    const updated = await db.getAsync('SELECT * FROM income WHERE id = ?', [incomeId]);

    res.json({
      message: 'Income updated successfully!',
      income: updated
    });
  } catch (err) {
    console.error('Update income error:', err);
    res.status(500).json({ error: 'Failed to update income record.' });
  }
});

// DELETE /api/income/:id - Delete income
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const incomeId = req.params.id;

    const existing = await db.getAsync('SELECT id FROM income WHERE id = ? AND user_id = ?', [incomeId, userId]);
    if (!existing) {
      return res.status(404).json({ error: 'Income record not found.' });
    }

    await db.runAsync('DELETE FROM income WHERE id = ? AND user_id = ?', [incomeId, userId]);

    res.json({ message: 'Income record deleted successfully!' });
  } catch (err) {
    console.error('Delete income error:', err);
    res.status(500).json({ error: 'Failed to delete income record.' });
  }
});

module.exports = router;
