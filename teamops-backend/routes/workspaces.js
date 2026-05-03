const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = auth;
const workspaceController = require('../controllers/workspaceController');
const boardController = require('../controllers/boardController');

router.post('/', auth, workspaceController.createWorkspace);
router.get('/', auth, workspaceController.getUserWorkspaces);
router.get('/join/invite', auth, workspaceController.joinByInviteToken);
router.get('/join/:code', auth, workspaceController.joinByCode);
router.get('/:workspaceId/boards', auth, requireRole('owner', 'admin', 'member', 'viewer'), boardController.getWorkspaceBoards);
router.post('/:workspaceId/boards', auth, requireRole('owner', 'admin'), boardController.createBoard);
router.get('/:workspaceId/members', auth, requireRole('owner', 'admin', 'member', 'viewer'), workspaceController.getWorkspaceMembers);
router.post('/:workspaceId/members', auth, requireRole('owner', 'admin'), workspaceController.addMember);
router.post('/:workspaceId/invite-email', auth, requireRole('owner', 'admin'), workspaceController.inviteByEmail);
router.patch('/:workspaceId/members/:userId/role', auth, requireRole('owner', 'admin'), workspaceController.updateMemberRole);
router.patch('/:workspaceId/members/:memberId', auth, requireRole('owner', 'admin'), workspaceController.updateMemberRole);
router.delete('/:workspaceId/members/:userId', auth, requireRole('owner', 'admin'), workspaceController.removeMember);
router.patch('/:workspaceId', auth, requireRole('owner', 'admin'), workspaceController.updateWorkspace);
router.delete('/:workspaceId', auth, requireRole('owner'), workspaceController.deleteWorkspace);
router.get('/:workspaceId', auth, requireRole('owner', 'admin', 'member', 'viewer'), workspaceController.getWorkspaceById);

module.exports = router;
