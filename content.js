const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/contentController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Optional auth: attaches req.user if token present, otherwise null
const optionalAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) { req.user = null; return next(); }
  try {
    const jwt = require('jsonwebtoken');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch { req.user = null; }
  next();
};

// IMPORTANT: static routes must come BEFORE /:id
router.get('/categories',    ctrl.getCategories);
router.get('/user/watchlist', verifyToken, ctrl.getWatchlist);
router.get('/user/history',   verifyToken, ctrl.getWatchHistory);

// Content CRUD
router.get('/',    optionalAuth, ctrl.getAllContent);
router.get('/:id', optionalAuth, ctrl.getContentById);

// Watch (gated)
router.post('/:id/watch',      verifyToken, ctrl.watchContent);

// Watchlist toggles
router.post('/:id/watchlist',  verifyToken, ctrl.addToWatchlist);
router.delete('/:id/watchlist',verifyToken, ctrl.removeFromWatchlist);

// Admin
router.post('/',    verifyAdmin, ctrl.addContent);
router.put('/:id',  verifyAdmin, ctrl.updateContent);
router.delete('/:id', verifyAdmin, ctrl.deleteContent);

module.exports = router;
