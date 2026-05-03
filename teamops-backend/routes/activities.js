const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const auth = require('../middleware/auth');

router.get('/workspace/:workspaceId', auth, activityController.getActivityFeed);
router.get('/workspace/:workspaceId/audit', auth, activityController.getAuditLog);
router.get('/:boardId', auth, activityController.getBoardActivities);

module.exports = router;
