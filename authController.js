const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required.' });

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ message: 'Email already registered.' });

    const hashedPass = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPass]
    );

    const token = generateToken({ id: result.insertId, email, role: 'user' });
    res.status(201).json({ message: 'Registration successful!', token, user: { id: result.insertId, name, email, role: 'user' } });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ message: 'Invalid credentials.' });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

    const token = generateToken(user);
    res.json({ message: 'Login successful!', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, avatar, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found.' });

    const [subscription] = await db.query(
      `SELECT s.*, p.name AS plan_name, p.video_quality, p.max_screens, p.downloads
       FROM subscriptions s JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = ? AND s.status = 'active' AND s.end_date >= CURDATE()
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.id]
    );

    res.json({ user: users[0], subscription: subscription[0] || null });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};
