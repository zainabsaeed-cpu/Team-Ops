const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'teamops_session';
const CSRF_COOKIE_NAME = 'teamops_csrf';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'teamops-dev-secret';

const isProduction = () => process.env.NODE_ENV === 'production';

const cookieSecurityOptions = () => ({
    secure: isProduction(),
    sameSite: isProduction() ? 'none' : 'lax',
    path: '/',
});

const sessionCookieOptions = () => ({
    ...cookieSecurityOptions(),
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_MS,
});

const csrfCookieOptions = () => ({
    ...cookieSecurityOptions(),
    httpOnly: false,
    maxAge: SESSION_MAX_AGE_MS,
});

const signCsrfValue = (nonce) => crypto
    .createHmac('sha256', csrfSecret)
    .update(nonce)
    .digest('base64url');

const createCsrfToken = () => {
    const nonce = crypto.randomBytes(32).toString('base64url');
    return `${nonce}.${signCsrfValue(nonce)}`;
};

const verifyCsrfToken = (token) => {
    if (!token || typeof token !== 'string') return false;
    const [nonce, signature] = token.split('.');
    if (!nonce || !signature) return false;
    const expected = signCsrfValue(nonce);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const setAuthCookies = (res, jwtToken) => {
    res.cookie(SESSION_COOKIE_NAME, jwtToken, sessionCookieOptions());
    setCsrfCookie(res);
};

const setCsrfCookie = (res) => {
    res.cookie(CSRF_COOKIE_NAME, createCsrfToken(), csrfCookieOptions());
};

const clearAuthCookies = (res) => {
    res.clearCookie(SESSION_COOKIE_NAME, { ...cookieSecurityOptions(), httpOnly: true });
    res.clearCookie(CSRF_COOKIE_NAME, { ...cookieSecurityOptions(), httpOnly: false });
};

module.exports = {
    SESSION_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    setAuthCookies,
    setCsrfCookie,
    clearAuthCookies,
    verifyCsrfToken,
};
