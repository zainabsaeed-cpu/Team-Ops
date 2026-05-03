const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const auth = require('../middleware/auth');
const { requireRole } = auth;

// Board endpoints
router.get('/:boardId', auth, requireRole('owner', 'admin', 'member', 'viewer'), boardController.getBoardData);
router.get('/:boardId/analytics', auth, requireRole('owner', 'admin', 'member', 'viewer'), boardController.getBoardAnalytics);
router.patch('/:boardId', auth, requireRole('owner', 'admin'), boardController.updateBoard);
router.delete('/:boardId', auth, requireRole('owner', 'admin'), boardController.deleteBoard);
router.post('/:boardId/columns', auth, requireRole('owner', 'admin'), boardController.createColumn);
router.patch('/:boardId/columns/:columnId', auth, requireRole('owner', 'admin'), boardController.updateColumn);
router.delete('/:boardId/columns/:columnId', auth, requireRole('owner', 'admin'), boardController.deleteColumn);

// Card CRUD endpoints
router.post('/:boardId/cards', auth, requireRole('owner', 'admin', 'member'), boardController.createCard);
router.patch('/:boardId/cards/:cardId', auth, requireRole('owner', 'admin', 'member'), boardController.updateCard);
router.delete('/:boardId/cards/:cardId', auth, requireRole('owner', 'admin', 'member'), boardController.deleteCard);
router.patch('/:boardId/cards/:cardId/move', auth, requireRole('owner', 'admin', 'member'), boardController.moveCard);

module.exports = router;
