const express = require('express');
const router = express.Router();
const { register, login, me, verify } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/verify', verify);
router.get('/me', auth, me);

module.exports = router;