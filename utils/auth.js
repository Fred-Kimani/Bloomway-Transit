const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const ALLOWED_SYMBOLS = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

function escapeForCharClass(value) {
  return value.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is not set or too short. Use a long, random value (>= 32 chars).');
  }
  return secret;
}

function validatePasswordStrength(password) {
  if (typeof password !== 'string') {
    return { ok: false, message: 'Password is required.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: 'Password must be between ' + MIN_PASSWORD_LENGTH + ' and ' + MAX_PASSWORD_LENGTH + ' characters.'
    };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { ok: false, message: 'Password must include at least one letter.' };
  }
  if (!/\d/.test(password)) {
    return { ok: false, message: 'Password must include at least one number.' };
  }
  const symbolClass = escapeForCharClass(ALLOWED_SYMBOLS);
  const symbolRegex = new RegExp(`[${symbolClass}]`);
  if (!symbolRegex.test(password)) {
    return { ok: false, message: 'Password must include at least one symbol: ' + ALLOWED_SYMBOLS };
  }
  const invalidRegex = new RegExp(`[^A-Za-z0-9${symbolClass}]`);
  if (invalidRegex.test(password)) {
    return { ok: false, message: 'Password contains unsupported characters. Allowed symbols: ' + ALLOWED_SYMBOLS };
  }
  return { ok: true };
}

function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function generateToken(payload) {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}

function verifyToken(token) {
  try {
    const secret = getJwtSecret();
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  validatePasswordStrength,
  getJwtSecret,
  normalizeEmail,
  isValidEmail,
};
