const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/categories - List system and user categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const categories = await db.allAsync(`
      SELECT 
        id, 
        name, 
        icon, 
        color, 
        user_id, 
        is_system, 
        created_at,
        (SELECT COUNT(*) FROM expenses WHERE category_id = categories.id AND user_id = ?) as expense_count,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE category_id = categories.id AND user_id = ?) as total_spent
      FROM categories
      WHERE is_system = 1 OR user_id = ?
      ORDER BY is_system DESC, name ASC
    `, [userId, userId, userId]);

    res.json({ categories });
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// POST /api/categories - Create a new category
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { name, icon, color, isSystemCategory } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const trimmedName = name.trim();
    const makeSystem = isAdmin && isSystemCategory === true ? 1 : 0;
    const catUserId = makeSystem ? null : userId;

    // Check duplicate
    const existing = await db.getAsync(`
      SELECT id FROM categories 
      WHERE LOWER(name) = LOWER(?) AND (is_system = 1 OR user_id = ?)
    `, [trimmedName, userId]);

    if (existing) {
      return res.status(400).json({ error: 'A category with this name already exists.' });
    }

    const result = await db.runAsync(`
      INSERT INTO categories (name, icon, color, user_id, is_system)
      VALUES (?, ?, ?, ?, ?)
    `, [
      trimmedName,
      icon || 'Tag',
      color || '#6366F1',
      catUserId,
      makeSystem
    ]);

    const created = await db.getAsync('SELECT * FROM categories WHERE id = ?', [result.lastID]);

    res.status(201).json({
      message: 'Category created successfully!',
      category: created
    });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { name, icon, color } = req.body;

    const existing = await db.getAsync('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    // Regular users can only edit their own custom categories
    if (!isAdmin && (existing.is_system === 1 || existing.user_id !== userId)) {
      return res.status(403).json({ error: 'You do not have permission to modify this category.' });
    }

    await db.runAsync(`
      UPDATE categories
      SET 
        name = ?,
        icon = ?,
        color = ?
      WHERE id = ?
    `, [
      name ? name.trim() : existing.name,
      icon || existing.icon,
      color || existing.color,
      categoryId
    ]);

    const updated = await db.getAsync('SELECT * FROM categories WHERE id = ?', [categoryId]);

    res.json({
      message: 'Category updated successfully!',
      category: updated
    });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const existing = await db.getAsync('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    if (!isAdmin && (existing.is_system === 1 || existing.user_id !== userId)) {
      return res.status(403).json({ error: 'You cannot delete this category.' });
    }

    // Check if category is used in expenses
    const usage = await db.getAsync('SELECT COUNT(*) as count FROM expenses WHERE category_id = ?', [categoryId]);
    if (usage && usage.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It is currently linked to ${usage.count} expense record(s).` 
      });
    }

    await db.runAsync('DELETE FROM categories WHERE id = ?', [categoryId]);

    res.json({ message: 'Category deleted successfully!' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

module.exports = router;
