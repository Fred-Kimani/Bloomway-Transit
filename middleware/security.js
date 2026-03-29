const rateLimit = require('express-rate-limit');
const csurf = require('csurf');

const isProd = process.env.NODE_ENV === 'production';
const RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || (5 * 60 * 1000));
const API_MAX = Number(process.env.RATE_LIMIT_API_MAX || 100);
const CONTACT_MAX = Number(process.env.RATE_LIMIT_CONTACT_MAX || 30);
const FORGOT_MAX = Number(process.env.RATE_LIMIT_FORGOT_MAX || 10);
const RESET_MAX = Number(process.env.RATE_LIMIT_RESET_MAX || 20);
const MEDIA_MAX = Number(process.env.RATE_LIMIT_MEDIA_MAX || 40);

// Rate limiter: max 5 login attempts per 5 minutes per IP
const loginLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: 5,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global API limiter for sensitive endpoints
const apiLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: API_MAX,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Contact limiter: reduce spam submissions
const contactLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: CONTACT_MAX,
  message: { error: 'Too many contact submissions, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Endpoint-specific hardening for account recovery and media actions
const forgotPasswordLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: FORGOT_MAX,
  message: { error: 'Too many forgot-password requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: RESET_MAX,
  message: { error: 'Too many reset-password attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const mediaLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: MEDIA_MAX,
  message: { error: 'Too many media requests, please try again later.' },
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
  apiLimiter,
  contactLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  mediaLimiter,
  csrfProtection,
  csrfErrorHandler,
};
