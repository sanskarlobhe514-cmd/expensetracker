const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/budget - Get current month budget overview and category budgets
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMonth = req.query.month || currentMonthStr;

    // 1. Overall monthly budget
    const overallBudget = await db.getAsync(`
      SELECT * FROM budgets 
      WHERE user_id = ? AND month = ? AND category_id IS NULL
    `, [userId, selectedMonth]);

    // 2. Total spent in this month
    const totalSpentRow = await db.getAsync(`
      SELECT COALESCE(SUM(amount), 0) as spent 
      FROM expenses 
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    `, [userId, selectedMonth]);

    const budgetAmount = overallBudget ? overallBudget.amount : 0;
    const spentAmount = totalSpentRow ? totalSpentRow.spent : 0;
    const remainingAmount = budgetAmount - spentAmount;
    const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

    let status = 'normal'; // 'normal', 'warning', 'danger'
    let message = 'Spending within healthy budget limits.';

    if (percentage >= 100) {
      status = 'danger';
      message = `Overspending Alert! You have exceeded your monthly budget by ₹${Math.abs(remainingAmount).toLocaleString('en-IN')}.`;
    } else if (percentage >= 80) {
      status = 'warning';
      message = `Warning: You have used ${percentage.toFixed(1)}% of your monthly budget. Only ₹${remainingAmount.toLocaleString('en-IN')} remaining!`;
    }

    // 3. Category level budgets and spent
    const categoryBudgets = await db.allAsync(`
      SELECT 
        b.id,
        b.month,
        b.amount as budget_amount,
        b.category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        (
          SELECT COALESCE(SUM(e.amount), 0) 
          FROM expenses e 
          WHERE e.user_id = b.user_id 
            AND e.category_id = b.category_id 
            AND strftime('%Y-%m', e.date) = b.month
        ) as spent_amount
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.month = ? AND b.category_id IS NOT NULL
    `, [userId, selectedMonth]);

    // Also get categories with spending but no specific budget assigned
    const categoriesSpendingWithoutBudget = await db.allAsync(`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        COALESCE(SUM(e.amount), 0) as spent_amount
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ? AND strftime('%Y-%m', e.date) = ?
        AND c.id NOT IN (
          SELECT category_id FROM budgets 
          WHERE user_id = ? AND month = ? AND category_id IS NOT NULL
        )
      GROUP BY c.id
    `, [userId, selectedMonth, userId, selectedMonth]);

    res.json({
      month: selectedMonth,
      budget: overallBudget ? overallBudget.amount : null,
      budgetId: overallBudget ? overallBudget.id : null,
      spent: spentAmount,
      remaining: remainingAmount,
      percentage: Number(percentage.toFixed(1)),
      status,
      message,
      categoryBudgets: categoryBudgets.map(cb => {
        const pct = cb.budget_amount > 0 ? (cb.spent_amount / cb.budget_amount) * 100 : 0;
        return {
          ...cb,
          remaining: cb.budget_amount - cb.spent_amount,
          percentage: Number(pct.toFixed(1)),
          isOver: pct >= 100,
          isWarning: pct >= 80 && pct < 100
        };
      }),
      otherSpending: categoriesSpendingWithoutBudget
    });
  } catch (err) {
    console.error('Fetch budget error:', err);
    res.status(500).json({ error: 'Failed to retrieve budget details.' });
  }
});

// GET /api/budget/history - Past monthly budgets with spending
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const budgets = await db.allAsync(`
      SELECT 
        b.id,
        b.month,
        b.amount as budget_amount,
        (
          SELECT COALESCE(SUM(e.amount), 0)
          FROM expenses e
          WHERE e.user_id = b.user_id AND strftime('%Y-%m', e.date) = b.month
        ) as spent_amount
      FROM budgets b
      WHERE b.user_id = ? AND b.category_id IS NULL
      ORDER BY b.month DESC
      LIMIT 12
    `, [userId]);

    const formattedHistory = budgets.map(b => {
      const remaining = b.budget_amount - b.spent_amount;
      const percentage = b.budget_amount > 0 ? (b.spent_amount / b.budget_amount) * 100 : 0;
      return {
        id: b.id,
        month: b.month,
        budget: b.budget_amount,
        spent: b.spent_amount,
        remaining,
        percentage: Number(percentage.toFixed(1)),
        status: percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : 'normal'
      };
    });

    res.json({ history: formattedHistory });
  } catch (err) {
    console.error('Budget history error:', err);
    res.status(500).json({ error: 'Failed to retrieve budget history.' });
  }
});

// POST /api/budget - Set or update monthly budget
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, amount, category_id } = req.body;

    if (!month || !amount) {
      return res.status(400).json({ error: 'Month (YYYY-MM) and amount are required.' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Budget amount must be a positive number.' });
    }

    const catId = category_id ? parseInt(category_id, 10) : null;

    // Check if budget exists for this month and category
    let existing;
    if (catId) {
      existing = await db.getAsync(
        'SELECT id FROM budgets WHERE user_id = ? AND month = ? AND category_id = ?',
        [userId, month, catId]
      );
    } else {
      existing = await db.getAsync(
        'SELECT id FROM budgets WHERE user_id = ? AND month = ? AND category_id IS NULL',
        [userId, month]
      );
    }

    if (existing) {
      await db.runAsync('UPDATE budgets SET amount = ? WHERE id = ?', [numAmount, existing.id]);
      const updated = await db.getAsync('SELECT * FROM budgets WHERE id = ?', [existing.id]);
      return res.json({ message: 'Budget updated successfully!', budget: updated });
    }

    const result = await db.runAsync(`
      INSERT INTO budgets (user_id, month, amount, category_id)
      VALUES (?, ?, ?, ?)
    `, [userId, month, numAmount, catId]);

    const created = await db.getAsync('SELECT * FROM budgets WHERE id = ?', [result.lastID]);

    res.status(201).json({
      message: 'Budget set successfully!',
      budget: created
    });
  } catch (err) {
    console.error('Set budget error:', err);
    res.status(500).json({ error: 'Failed to save budget.' });
  }
});

// DELETE /api/budget/:id - Remove a budget
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const budgetId = req.params.id;

    const existing = await db.getAsync('SELECT id FROM budgets WHERE id = ? AND user_id = ?', [budgetId, userId]);
    if (!existing) {
      return res.status(404).json({ error: 'Budget record not found.' });
    }

    await db.runAsync('DELETE FROM budgets WHERE id = ? AND user_id = ?', [budgetId, userId]);
    res.json({ message: 'Budget removed successfully!' });
  } catch (err) {
    console.error('Delete budget error:', err);
    res.status(500).json({ error: 'Failed to delete budget.' });
  }
});

module.exports = router;
