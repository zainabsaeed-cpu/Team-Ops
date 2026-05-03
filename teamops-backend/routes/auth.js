const express = require('express');
const router = express.Router();
const { register, login, me, verify, googleLogin, resendVerification, forgotPassword, resetPassword } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/verify', verify);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', auth, me);

module.exports = router;
