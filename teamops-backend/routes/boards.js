const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const auth = require('../middleware/auth');

// Board endpoints
router.get('/:boardId', auth, boardController.getBoardData);

// Card CRUD endpoints
router.post('/:boardId/cards', auth, boardController.createCard);
router.patch('/:boardId/cards/:cardId', auth, boardController.updateCard);
router.delete('/:boardId/cards/:cardId', auth, boardController.deleteCard);
router.patch('/:boardId/cards/:cardId/move', auth, boardController.moveCard);

module.exports = router;
