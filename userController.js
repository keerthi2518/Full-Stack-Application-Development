const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/users/watchlist
exports.getWatchlist = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, w.added_at FROM watchlist w
      JOIN content c ON c.id = w.content_id
      WHERE w.user_id = ?
      ORDER BY w.added_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users/watchlist/:contentId
exports.addWatchlist = async (req, res) => {
  try {
    await pool.query('INSERT IGNORE INTO watchlist (user_id, content_id) VALUES (?, ?)', [req.user.id, req.params.contentId]);
    res.json({ success: true, message: 'Added to watchlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/users/watchlist/:contentId
exports.removeWatchlist = async (req, res) => {
  try {
    await pool.query('DELETE FROM watchlist WHERE user_id = ? AND content_id = ?', [req.user.id, req.params.contentId]);
    res.json({ success: true, message: 'Removed from watchlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/history
exports.getHistory = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, wh.watched_at, wh.progress_seconds, wh.completed FROM watch_history wh
      JOIN content c ON c.id = wh.content_id
      WHERE wh.user_id = ?
      ORDER BY wh.watched_at DESC
      LIMIT 50
    `, [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users/history
exports.addHistory = async (req, res) => {
  const { content_id, progress_seconds = 0, completed = 0 } = req.body;
  try {
    await pool.query(`
      INSERT INTO watch_history (user_id, content_id, progress_seconds, completed)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE progress_seconds = ?, completed = ?, watched_at = NOW()
    `, [req.user.id, content_id, progress_seconds, completed, progress_seconds, completed]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  const { name, avatar } = req.body;
  try {
    await pool.query('UPDATE users SET name = ?, avatar = ? WHERE id = ?', [name, avatar, req.user.id]);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/users/change-password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const [[user]] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/admin/all (admin)
exports.adminGetAll = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
             us.status as sub_status, sp.name as plan_name
      FROM users u
      LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active' AND us.end_date >= CURDATE()
      LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/admin/stats (admin)
exports.adminStats = async (req, res) => {
  try {
    const [[{ total_users }]] = await pool.query('SELECT COUNT(*) as total_users FROM users WHERE role = "user"');
    const [[{ active_subs }]] = await pool.query('SELECT COUNT(*) as active_subs FROM user_subscriptions WHERE status = "active" AND end_date >= CURDATE()');
    const [[{ total_content }]] = await pool.query('SELECT COUNT(*) as total_content FROM content');
    const [[{ total_revenue }]] = await pool.query('SELECT COALESCE(SUM(amount_paid), 0) as total_revenue FROM user_subscriptions WHERE status = "active"');
    const [plan_dist] = await pool.query(`
      SELECT sp.name, COUNT(*) as count FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.status = 'active' AND us.end_date >= CURDATE()
      GROUP BY sp.name
    `);
    res.json({ success: true, data: { total_users, active_subs, total_content, total_revenue, plan_dist } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};