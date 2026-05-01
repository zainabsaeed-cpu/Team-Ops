const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const workspaceController = require('../controllers/workspaceController');

router.post('/', auth, workspaceController.createWorkspace);
router.get('/', auth, workspaceController.getUserWorkspaces);
router.get('/:workspaceId', auth, workspaceController.getWorkspaceById);
router.get('/:workspaceId/members', auth, workspaceController.getWorkspaceMembers);
router.post('/:workspaceId/members', auth, workspaceController.addMember);

module.exports = router;