const express = require('express');
const router = express.Router();
const columnController = require('../controllers/columnController');
const auth = require('../middleware/auth');
const { requireRole } = auth;

router.get('/workspace/:workspaceId', auth, requireRole('owner', 'admin', 'member', 'viewer'), columnController.getColumns);
router.post('/workspace/:workspaceId', auth, requireRole('owner', 'admin'), columnController.createColumn);
router.patch('/:columnId', auth, requireRole('owner', 'admin'), columnController.updateColumn);
router.delete('/:columnId', auth, requireRole('owner', 'admin'), columnController.deleteColumn);

module.exports = router;
