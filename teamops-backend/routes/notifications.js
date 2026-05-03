const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.get('/', auth, notificationController.getNotifications);
router.get('/count', auth, notificationController.getUnreadCount);
router.patch('/read-all', auth, notificationController.readAllNotifications);
router.patch('/:id/important', auth, notificationController.toggleNotificationImportant);
router.patch('/:id/read', auth, notificationController.markNotificationRead);

module.exports = router;
