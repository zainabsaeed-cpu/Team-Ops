const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.get('/', auth, notificationController.getNotifications);
router.patch('/:id/read', auth, notificationController.markNotificationRead);
router.patch('/read-all', auth, notificationController.readAllNotifications);

module.exports = router;
