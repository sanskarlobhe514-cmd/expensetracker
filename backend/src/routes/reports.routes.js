const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reports/summary - Comprehensive report breakdown
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, month } = req.query;

    let dateCondition = '';
    const dateParams = [];

    if (month) {
      dateCondition = `AND strftime('%Y-%m', e.date) = ?`;
      dateParams.push(month);
    } else if (startDate && endDate) {
      dateCondition = `AND e.date BETWEEN ? AND ?`;
      dateParams.push(startDate, endDate);
    } else if (startDate) {
      dateCondition = `AND e.date >= ?`;
      dateParams.push(startDate);
    } else if (endDate) {
      dateCondition = `AND e.date <= ?`;
      dateParams.push(endDate);
    }

    // 1. Overall Totals
    const expenseTotals = await db.getAsync(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalExpenses
      FROM expenses e
      WHERE e.user_id = ? ${dateCondition}
    `, [userId, ...dateParams]);

    // Matching date condition for income
    let incDateCondition = dateCondition.replace(/e\./g, 'i.');
    const incomeTotals = await db.getAsync(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalIncome
      FROM income i
      WHERE i.user_id = ? ${incDateCondition}
    `, [userId, ...dateParams]);

    const totalIncome = incomeTotals.totalIncome;
    const totalExpenses = expenseTotals.totalExpenses;
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

    // 2. Category Breakdown
    const categoryBreakdown = await db.allAsync(`
      SELECT 
        c.id,
        c.name,
        c.icon,
        c.color,
        COUNT(e.id) as transaction_count,
        COALESCE(SUM(e.amount), 0) as total_amount
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id AND e.user_id = ? ${dateCondition}
      GROUP BY c.id, c.name, c.icon, c.color
      HAVING total_amount > 0
      ORDER BY total_amount DESC
    `, [userId, ...dateParams]);

    const totalCatExpense = categoryBreakdown.reduce((acc, c) => acc + c.total_amount, 0);
    const categoryWithPercentages = categoryBreakdown.map(c => ({
      ...c,
      percentage: totalCatExpense > 0 ? Number(((c.total_amount / totalCatExpense) * 100).toFixed(1)) : 0
    }));

    // 3. Payment Method Breakdown
    const paymentMethods = await db.allAsync(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM expenses e
      WHERE user_id = ? ${dateCondition}
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `, [userId, ...dateParams]);

    // 4. Daily Expenses (Last 30 Days or within range)
    const dailyExpenses = await db.allAsync(`
      SELECT 
        date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as amount
      FROM expenses e
      WHERE user_id = ? ${dateCondition}
      GROUP BY date
      ORDER BY date ASC
    `, [userId, ...dateParams]);

    // 5. Monthly Income vs Expenses (Last 6 months)
    const monthlyComparison = await db.allAsync(`
      WITH months AS (
        SELECT DISTINCT strftime('%Y-%m', date) as m FROM expenses WHERE user_id = ?
        UNION
        SELECT DISTINCT strftime('%Y-%m', date) as m FROM income WHERE user_id = ?
      )
      SELECT 
        m as month,
        (SELECT COALESCE(SUM(amount), 0) FROM income WHERE user_id = ? AND strftime('%Y-%m', date) = m) as income,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = ? AND strftime('%Y-%m', date) = m) as expenses
      FROM months
      ORDER BY m ASC
      LIMIT 12
    `, [userId, userId, userId, userId]);

    res.json({
      totals: {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate: Number(savingsRate),
        transactionCount: expenseTotals.count + incomeTotals.count,
        expenseCount: expenseTotals.count,
        incomeCount: incomeTotals.count
      },
      categoryBreakdown: categoryWithPercentages,
      paymentMethods,
      dailyExpenses,
      monthlyComparison
    });
  } catch (err) {
    console.error('Reports summary error:', err);
    res.status(500).json({ error: 'Failed to generate report summary.' });
  }
});

// GET /api/reports/insights - Smart Spending Insights
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Current month total vs Previous month total
    const currentMonthSpent = await db.getAsync(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    `, [userId, currentMonth]);

    const prevMonthSpent = await db.getAsync(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    `, [userId, prevMonth]);

    const curSpent = currentMonthSpent.total;
    const prevSpent = prevMonthSpent.total;

    let overallGrowth = 0;
    if (prevSpent > 0) {
      overallGrowth = Number((((curSpent - prevSpent) / prevSpent) * 100).toFixed(1));
    }

    // Category month-over-month comparison
    const curMonthCategories = await db.allAsync(`
      SELECT c.id, c.name, COALESCE(SUM(e.amount), 0) as total
      FROM categories c
      JOIN expenses e ON e.category_id = c.id
      WHERE e.user_id = ? AND strftime('%Y-%m', e.date) = ?
      GROUP BY c.id, c.name
    `, [userId, currentMonth]);

    const prevMonthCategories = await db.allAsync(`
      SELECT c.id, c.name, COALESCE(SUM(e.amount), 0) as total
      FROM categories c
      JOIN expenses e ON e.category_id = c.id
      WHERE e.user_id = ? AND strftime('%Y-%m', e.date) = ?
      GROUP BY c.id, c.name
    `, [userId, prevMonth]);

    const prevCatMap = {};
    prevMonthCategories.forEach(c => { prevCatMap[c.id] = c.total; });

    const smartInsights = [];

    // Overall spending insight
    if (prevSpent > 0) {
      if (overallGrowth > 0) {
        smartInsights.push({
          type: 'warning',
          title: 'Monthly Spending Increased',
          message: `Your total spending increased by ${overallGrowth}% compared with last month (₹${curSpent.toLocaleString('en-IN')} vs ₹${prevSpent.toLocaleString('en-IN')}).`
        });
      } else if (overallGrowth < 0) {
        smartInsights.push({
          type: 'positive',
          title: 'Great Savings Progress',
          message: `Your total spending decreased by ${Math.abs(overallGrowth)}% compared with last month! Keep it up!`
        });
      }
    }

    // Category comparison insights (e.g. "Your Food expenses increased by 25%...")
    for (const cat of curMonthCategories) {
      const prevCatAmount = prevCatMap[cat.id] || 0;
      if (prevCatAmount > 0) {
        const catGrowth = Number((((cat.total - prevCatAmount) / prevCatAmount) * 100).toFixed(1));
        if (catGrowth >= 15) {
          smartInsights.push({
            type: 'alert',
            title: `${cat.name} Surge`,
            message: `Your ${cat.name} expenses increased by ${catGrowth}% compared with last month (₹${cat.total.toLocaleString('en-IN')} vs ₹${prevCatAmount.toLocaleString('en-IN')}).`
          });
        } else if (catGrowth <= -20) {
          smartInsights.push({
            type: 'positive',
            title: `${cat.name} Savings`,
            message: `You spent ${Math.abs(catGrowth)}% less on ${cat.name} this month compared with last month.`
          });
        }
      }
    }

    // Highest spending category
    const topCategory = await db.getAsync(`
      SELECT c.name, COALESCE(SUM(e.amount), 0) as total
      FROM categories c
      JOIN expenses e ON e.category_id = c.id
      WHERE e.user_id = ? AND strftime('%Y-%m', e.date) = ?
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 1
    `, [userId, currentMonth]);

    if (topCategory && topCategory.total > 0) {
      smartInsights.push({
        type: 'info',
        title: 'Top Expenditure Category',
        message: `${topCategory.name} is your highest expense this month at ₹${topCategory.total.toLocaleString('en-IN')} (${curSpent > 0 ? ((topCategory.total / curSpent) * 100).toFixed(0) : 0}% of monthly spend).`
      });
    }

    // Single highest transaction
    const highestExpense = await db.getAsync(`
      SELECT e.title, e.amount, e.date, c.name as category_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ? AND strftime('%Y-%m', e.date) = ?
      ORDER BY e.amount DESC
      LIMIT 1
    `, [userId, currentMonth]);

    // Average daily expense
    const daysInMonthSoFar = Math.max(1, now.getDate());
    const avgDailySpend = Math.round(curSpent / daysInMonthSoFar);

    res.json({
      currentMonthSpent: curSpent,
      prevMonthSpent: prevSpent,
      overallGrowth,
      avgDailySpend,
      topCategory,
      highestExpense,
      insights: smartInsights
    });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ error: 'Failed to generate smart insights.' });
  }
});

module.exports = router;
