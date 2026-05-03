const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const auth = require('../middleware/auth');
const { requireRole } = auth;

router.get('/column/:columnId', auth, requireRole('owner', 'admin', 'member', 'viewer'), cardController.getCards);
router.post('/column/:columnId', auth, requireRole('owner', 'admin', 'member'), cardController.createCard);
router.patch('/:cardId/move', auth, requireRole('owner', 'admin', 'member'), cardController.moveCard);
router.patch('/:cardId', auth, requireRole('owner', 'admin', 'member'), cardController.updateCard);
router.delete('/:cardId', auth, requireRole('owner', 'admin', 'member'), cardController.deleteCard);

module.exports = router;
