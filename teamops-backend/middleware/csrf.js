const { SESSION_COOKIE_NAME, verifyCsrfToken } = require('../utils/authCookies');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set([
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/google',
    '/api/auth/verify',
    '/api/auth/resend-verification',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/logout',
]);

module.exports = (req, res, next) => {
    if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) {
        return next();
    }

    if (!req.cookies?.[SESSION_COOKIE_NAME]) {
        return next();
    }

    const csrfHeader = req.get('x-csrf-token') || '';

    if (!csrfHeader || !verifyCsrfToken(csrfHeader)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    return next();
};
