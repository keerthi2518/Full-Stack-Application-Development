const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subscriptionController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

router.get('/plans', ctrl.getPlans);
router.post('/subscribe', verifyToken, ctrl.subscribe);
router.get('/my', verifyToken, ctrl.getMySubscription);
router.put('/cancel', verifyToken, ctrl.cancelSubscription);
router.get('/all', verifyAdmin, ctrl.getAllSubscriptions);

module.exports = router;