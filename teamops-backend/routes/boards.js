const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const auth = require('../middleware/auth');

router.get('/:boardId', auth, boardController.getBoardData);
router.patch('/:boardId/cards/:cardId/move', auth, boardController.moveCard);

module.exports = router;
