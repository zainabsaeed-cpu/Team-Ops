const express = require('express');
const router = express.Router();
const userPagesController = require('../controllers/userPagesController');
const auth = require('../middleware/auth');

router.get('/analytics', auth, userPagesController.getAnalytics);
router.get('/activity', auth, userPagesController.getActivityFeed);
router.get('/members', auth, userPagesController.getMembers);
router.get('/achievements', auth, userPagesController.getAchievements);
router.get('/schedule', auth, userPagesController.getSchedule);
router.get('/messages', auth, userPagesController.getMessages);
router.get('/settings', auth, userPagesController.getSettings);
router.patch('/settings', auth, userPagesController.updateSettings);
router.get('/profile', auth, userPagesController.getProfile);
router.patch('/profile', auth, userPagesController.updateProfile);
router.get('/my-cards', auth, userPagesController.getMyCards);
router.patch('/password', auth, userPagesController.changePassword);

module.exports = router;
