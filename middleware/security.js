const rateLimit = require('express-rate-limit');
const csurf = require('csurf');

const isProd = process.env.NODE_ENV === 'production';

// Rate limiter: max 5 login attempts per 5 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register limiter: reduce automated admin creation attempts
const registerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: 'Too many registration attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global API limiter for sensitive endpoints
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Contact limiter: reduce spam submissions
const contactLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Too many contact submissions, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CSRF protection middleware (use after cookie parser)
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
  },
});

function csrfErrorHandler(err, req, res, next) {
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  return next(err);
}

module.exports = {
  loginLimiter,
  registerLimiter,
  apiLimiter,
  contactLimiter,
  csrfProtection,
  csrfErrorHandler,
};
