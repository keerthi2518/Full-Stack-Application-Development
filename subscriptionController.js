const db = require('../config/db');

// Get all plans
exports.getPlans = async (req, res) => {
  try {
    const [plans] = await db.query('SELECT * FROM plans WHERE is_active = TRUE');
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Subscribe to a plan
exports.subscribe = async (req, res) => {
  try {
    const { plan_id, payment_method } = req.body;
    const user_id = req.user.id;

    const [plans] = await db.query('SELECT * FROM plans WHERE id = ? AND is_active = TRUE', [plan_id]);
    if (plans.length === 0) return res.status(404).json({ message: 'Plan not found.' });

    const plan = plans[0];
    const start_date = new Date();
    const end_date = new Date();
    end_date.setDate(end_date.getDate() + plan.duration_days);

    // Cancel any existing active subscription
    await db.query(
      "UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'",
      [user_id]
    );

    // Insert new subscription
    const [result] = await db.query(
      'INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, amount_paid, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, plan_id, start_date.toISOString().split('T')[0], end_date.toISOString().split('T')[0], plan.price, payment_method || 'card']
    );

    res.status(201).json({
      message: `Successfully subscribed to ${plan.name} plan!`,
      subscription_id: result.insertId,
      plan_name: plan.name,
      end_date: end_date.toISOString().split('T')[0]
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Get user's subscription status
exports.getMySubscription = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, p.name AS plan_name, p.price, p.video_quality, p.max_screens, p.downloads
       FROM subscriptions s JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = ? AND s.status = 'active' AND s.end_date >= CURDATE()
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    await db.query(
      "UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'",
      [req.user.id]
    );
    res.json({ message: 'Subscription cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Admin: all subscriptions
exports.getAllSubscriptions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, u.name AS user_name, u.email, p.name AS plan_name
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       JOIN plans p ON s.plan_id = p.id
       ORDER BY s.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};