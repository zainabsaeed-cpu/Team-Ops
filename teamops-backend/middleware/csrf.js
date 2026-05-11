const { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME, verifyCsrfToken } = require('../utils/authCookies');

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

    const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME] || '';
    const csrfHeader = req.get('x-csrf-token') || '';

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader || !verifyCsrfToken(csrfCookie)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    return next();
};
