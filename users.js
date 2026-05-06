const express = require('express');
const router = express.Router();
const u = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/watchlist', protect, u.getWatchlist);
router.post('/watchlist/:contentId', protect, u.addWatchlist);
router.delete('/watchlist/:contentId', protect, u.removeWatchlist);
router.get('/history', protect, u.getHistory);
router.post('/history', protect, u.addHistory);
router.put('/profile', protect, u.updateProfile);
router.put('/change-password', protect, u.changePassword);
router.get('/admin/all', protect, adminOnly, u.adminGetAll);
router.get('/admin/stats', protect, adminOnly, u.adminStats);

module.exports = router;