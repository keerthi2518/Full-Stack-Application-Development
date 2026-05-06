const db = require('../config/db');

// Tier hierarchy: free=0, basic=1, standard=2, premium=3
const PLAN_LEVELS = { free: 0, basic: 1, standard: 2, premium: 3 };

// Detect active plan level for a user — works with both schema versions
const getUserPlanLevel = async (user_id) => {
  // Try schema v1: subscriptions + plans
  try {
    const [rows] = await db.query(
      `SELECT p.name FROM subscriptions s JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = ? AND s.status = 'active' AND s.end_date >= CURDATE()
       ORDER BY s.created_at DESC LIMIT 1`,
      [user_id]
    );
    if (rows.length) return PLAN_LEVELS[rows[0].name.toLowerCase()] ?? 0;
  } catch {}
  // Try schema v2: user_subscriptions + subscription_plans
  try {
    const [rows] = await db.query(
      `SELECT sp.name FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = ? AND us.status = 'active' AND us.end_date >= CURDATE()
       ORDER BY us.created_at DESC LIMIT 1`,
      [user_id]
    );
    if (rows.length) return PLAN_LEVELS[rows[0].name.toLowerCase()] ?? 0;
  } catch {}
  return 0; // no active subscription = free tier
};

// Helper: annotate each content item with has_access
const annotate = (items, userPlanLevel) =>
  items.map(item => {
    const required = (item.required_plan || 'basic').toLowerCase();
    const requiredLevel = PLAN_LEVELS[required] ?? 1;
    return { ...item, required_plan: required, has_access: userPlanLevel >= requiredLevel };
  });

// ----------------------------------------------------------------
// GET /api/content  — list with optional filters
// ----------------------------------------------------------------
exports.getAllContent = async (req, res) => {
  try {
    const { type, genre, category, language, search, featured, trending, newContent, limit = 20, page = 1 } = req.query;
    let query = 'SELECT * FROM content WHERE 1=1';
    const params = [];

    if (type)     { query += ' AND type = ?';                            params.push(type); }
    if (genre)    { query += ' AND genre LIKE ?';                        params.push(`%${genre}%`); }
    if (category) { query += ' AND genre LIKE ?';                        params.push(`%${category}%`); }
    if (language) { query += ' AND language = ?';                        params.push(language); }
    if (search)   { query += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (featured    === 'true') query += ' AND is_featured = TRUE';
    if (trending    === 'true') query += ' AND is_trending = TRUE';
    if (newContent  === 'true') query += ' AND is_new = TRUE';

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [content] = await db.query(query, params);

    let userPlanLevel = 0;
    if (req.user) userPlanLevel = await getUserPlanLevel(req.user.id);

    res.json(annotate(content, userPlanLevel));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ----------------------------------------------------------------
// GET /api/content/categories
// ----------------------------------------------------------------
exports.getCategories = async (req, res) => {
  try {
    // Try dedicated categories table, fall back to distinct genres
    try {
      const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
      if (rows.length) return res.json(rows);
    } catch {}
    const [rows] = await db.query('SELECT DISTINCT genre AS name, genre AS slug FROM content WHERE genre IS NOT NULL ORDER BY genre');
    res.json(rows.map(r => ({ name: r.name, slug: r.slug, icon: '🎬' })));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ----------------------------------------------------------------
// GET /api/content/:id  — single item with access flag
// ----------------------------------------------------------------
exports.getContentById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM content WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Content not found' });

    let userPlanLevel = 0;
    if (req.user) userPlanLevel = await getUserPlanLevel(req.user.id);

    res.json(annotate(rows, userPlanLevel)[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ----------------------------------------------------------------
// POST /api/content/:id/watch  — gated streaming endpoint
// ----------------------------------------------------------------
exports.watchContent = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM content WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Content not found' });

    const item = rows[0];
    const userPlanLevel = await getUserPlanLevel(req.user.id);
    const required = (item.required_plan || 'basic').toLowerCase();
    const requiredLevel = PLAN_LEVELS[required] ?? 1;

    if (userPlanLevel < requiredLevel) {
      return res.status(403).json({
        message: `Upgrade to ${required.toUpperCase()} plan to watch this content.`,
        upgrade_required: required
      });
    }

    await db.query('UPDATE content SET views = views + 1 WHERE id = ?', [item.id]);
    try {
      await db.query(
        'INSERT INTO watch_history (user_id, content_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE watched_at = NOW()',
        [req.user.id, item.id]
      );
    } catch {}

    res.json({ message: 'Enjoy watching!', video_url: item.video_url || null });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ----------------------------------------------------------------
// GET /api/content/user/history
// ----------------------------------------------------------------
exports.getWatchHistory = async (req, res) => {
  try {
    let rows = [];
    try {
      [rows] = await db.query(
        'SELECT c.*, wh.watched_at FROM watch_history wh JOIN content c ON wh.content_id = c.id WHERE wh.user_id = ? ORDER BY wh.watched_at DESC LIMIT 20',
        [req.user.id]
      );
    } catch {}
    const userPlanLevel = await getUserPlanLevel(req.user.id);
    res.json(annotate(rows, userPlanLevel));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ----------------------------------------------------------------
// Watchlist
// ----------------------------------------------------------------
exports.addToWatchlist = async (req, res) => {
  try {
    await db.query('INSERT IGNORE INTO watchlist (user_id, content_id) VALUES (?, ?)', [req.user.id, req.params.id]);
    res.json({ message: 'Added to watchlist.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.removeFromWatchlist = async (req, res) => {
  try {
    await db.query('DELETE FROM watchlist WHERE user_id = ? AND content_id = ?', [req.user.id, req.params.id]);
    res.json({ message: 'Removed from watchlist.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getWatchlist = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT c.* FROM watchlist w JOIN content c ON w.content_id = c.id WHERE w.user_id = ? ORDER BY w.added_at DESC',
      [req.user.id]
    );
    const userPlanLevel = await getUserPlanLevel(req.user.id);
    res.json(annotate(rows, userPlanLevel));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ----------------------------------------------------------------
// Admin CRUD
// ----------------------------------------------------------------
exports.addContent = async (req, res) => {
  try {
    const { title, description, type, genre, language, release_year, duration_mins,
            rating, thumbnail, required_plan, is_featured, is_trending, is_new } = req.body;
    const [result] = await db.query(
      `INSERT INTO content (title, description, type, genre, language, release_year, duration_mins,
       rating, thumbnail, required_plan, is_featured, is_trending, is_new)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [title, description, type, genre||null, language||'English', release_year||null,
       duration_mins||null, rating||0, thumbnail||null, required_plan||'basic',
       is_featured||false, is_trending||false, is_new||false]
    );
    res.status(201).json({ message: 'Content added!', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const fields = ['title','description','type','genre','language','release_year','duration_mins',
                    'rating','thumbnail','required_plan','is_featured','is_trending','is_new'];
    const sets = []; const vals = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { sets.push(`${f}=?`); vals.push(req.body[f]); } });
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' });
    vals.push(req.params.id);
    await db.query(`UPDATE content SET ${sets.join(',')} WHERE id=?`, vals);
    res.json({ message: 'Updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteContent = async (req, res) => {
  try {
    await db.query('DELETE FROM content WHERE id = ?', [req.params.id]);
    res.json({ message: 'Content deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};