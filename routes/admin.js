const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
require('dotenv').config();
const {
  generateToken,
  verifyToken: verifyJwt,
  comparePassword,
  hashPassword,
  validatePasswordStrength,
  normalizeEmail,
  isValidEmail,
} = require('../utils/auth');
const {
  loginLimiter,
  csrfProtection,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  mediaLimiter,
} = require('../middleware/security');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sanitizeHtml, sanitizePlainText } = require('../utils/sanitize');

const isProd = process.env.NODE_ENV === 'production';
function requireEnv(name) {
  const value = process.env[name];
  if (isProd && (!value || String(value).trim() === '')) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
const authCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,
  path: '/',
};

const MASTER_ADMIN_EMAIL = 'info@bloomwaytransit.com';
const INVITE_ADMIN_EMAIL = 'info@bloomwaytransit.com';
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

function generateResetToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function getPublicAppUrl() {
  if (isProd) return requireEnv('PUBLIC_APP_URL');
  return process.env.PUBLIC_APP_URL || 'http://localhost:3000';
}

function sanitizeUserForAudit(user) {
  if (!user) return user;
  const { password_hash, ...rest } = user;
  return rest;
}

function safeJson(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  try {
    return JSON.stringify(value);
  } catch (e) {
    return null;
  }
}

async function logAudit({ userId, action, tableName, recordId, oldData, newData }) {
  try {
    const auditId = crypto.randomUUID();
    await db.query(
      'INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [auditId, userId || null, action, tableName, recordId || null, safeJson(oldData), safeJson(newData)]
    );
  } catch (error) {
    console.warn('Audit log failed:', error && error.message ? error.message : error);
  }
}

// ====== Uploads ======
const uploadsEnabled = String(process.env.UPLOADS_ENABLED || 'true').toLowerCase() === 'true';
const uploadDir = path.join(__dirname, '../uploads');
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

let upload = null;
if (uploadsEnabled) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const ext = EXT_BY_MIME[file.mimetype] || '';
      const filename = crypto.randomUUID() + ext;
      cb(null, filename);
    }
  });

  upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        const err = new Error('INVALID_FILE_TYPE');
        return cb(err);
      }
      cb(null, true);
    }
  });
}

// ====== Email Transport (SMTP) ======
// IONOS defaults are used when values are not provided explicitly.
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.ionos.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = requireEnv('SMTP_USER');
const SMTP_PASS = requireEnv('SMTP_PASS');
const FROM_EMAIL = process.env.SMTP_FROM || SMTP_USER;

const transporter = SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

function logFailedLoginAttempt({ email, ip, userAgent, reason }) {
  // Placeholder for centralized logging/monitoring (e.g., SIEM/CloudWatch/Datadog).
  console.warn('Failed login attempt', {
    timestamp: new Date().toISOString(),
    email,
    ip,
    userAgent,
    reason,
  });
}

// Apply CSRF protection to all state-changing routes
router.use(csrfProtection);

// Register
router.post('/register', async (req, res) => {
  try {
    const email = normalizeEmail(sanitizePlainText(req.body.email || ''));
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.ok) {
      return res.status(400).json({ error: passwordCheck.message });
    }

    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newId = crypto.randomUUID();
    const hash = await hashPassword(password);
    await db.query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [newId, email, hash]);

    await logAudit({
      userId: newId,
      action: 'admin_register',
      tableName: 'users',
      recordId: newId,
      oldData: null,
      newData: { id: newId, email }
    });

    res.status(201).json({ message: 'Admin account registered successfully!' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// CSRF Token Route
router.get('/csrf-token', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ csrfToken: req.csrfToken() });
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(sanitizePlainText(req.body.email || ''));
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      logFailedLoginAttempt({ email, ip: req.ip, userAgent: req.get('user-agent'), reason: 'user_not_found' });
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const isMaster = String(user.email || '').toLowerCase() === String(MASTER_ADMIN_EMAIL).toLowerCase();
    if (!isMaster && (user.is_approved === 0 || user.is_approved === false)) {
      logFailedLoginAttempt({ email, ip: req.ip, userAgent: req.get('user-agent'), reason: 'not_approved' });
      return res.status(403).json({ error: 'Account is not approved.' });
    }
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      logFailedLoginAttempt({ email, ip: req.ip, userAgent: req.get('user-agent'), reason: 'bad_password' });
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, email: user.email });
    
    res.cookie('token', token, authCookieOptions);
    res.json({
      message: 'Login successful',
      twoFactor: {
        required: false,
        placeholder: true,
        message: '2FA placeholder: integrate TOTP/SMS/email verification for admin accounts.',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: authCookieOptions.httpOnly,
    secure: authCookieOptions.secure,
    sameSite: authCookieOptions.sameSite,
    path: authCookieOptions.path,
  });
  res.json({ message: 'Logged out successfully' });
});

// Protected Route Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(403).json({ error: 'No token provided' });

  const decoded = verifyJwt(token);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized token' });
  
  try {
    const [users] = await db.query('SELECT is_approved, email FROM users WHERE id = ?', [decoded.id]);
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Unauthorized token' });
    }
    const isMaster = String(users[0].email || '').toLowerCase() === String(MASTER_ADMIN_EMAIL).toLowerCase();
    if (!isMaster && (users[0].is_approved === 0 || users[0].is_approved === false)) {
      return res.status(403).json({ error: 'Account is not approved.' });
    }
    req.userId = decoded.id;
    req.userEmail = users[0].email;
    next();
  } catch (err) {
    console.error('Verify token error:', err);
    return res.status(500).json({ error: 'Server error during auth check' });
  }
};

router.get('/verify', verifyToken, (req, res) => {
  res.status(200).json({ valid: true, email: req.userEmail || null });
});

// 2FA placeholder endpoint (not a full implementation)
router.post('/2fa/verify', verifyToken, async (req, res) => {
  return res.status(501).json({
    error: '2FA verification is not implemented yet.',
    placeholder: true,
    nextStep: 'Implement TOTP challenge verification for admin accounts.',
  });
});

// Change Password (authenticated)
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.ok) {
      return res.status(400).json({ error: passwordCheck.message });
    }

    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    let isMatch = false;
    try {
      isMatch = await comparePassword(String(currentPassword), String(user.password_hash || ''));
    } catch (err) {
      isMatch = false;
    }
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const isReuse = await comparePassword(String(newPassword), String(user.password_hash || ''));
    if (isReuse) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const newHash = await hashPassword(newPassword);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.userId]);
    await logAudit({
      userId: req.userId,
      action: 'password_change',
      tableName: 'users',
      recordId: req.userId,
      oldData: { password_changed: true },
      newData: { password_changed: true }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error during password change' });
  }
});

// ====== ADMIN MANAGEMENT ======
router.get('/admins', verifyToken, async (req, res) => {
  try {
    const [admins] = await db.query('SELECT id, email, is_approved, created_at FROM users WHERE id <> ? ORDER BY created_at DESC', [req.userId]);
    res.json(admins);
  } catch (error) {
    console.error('Fetch admins error:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

router.patch('/admins/:id/approval', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const isApproved = req.body.is_approved;

    if (String(id) === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot change your own approval status' });
    }

    if (typeof isApproved !== 'boolean') {
      return res.status(400).json({ error: 'is_approved must be a boolean' });
    }

    const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    const oldAdmin = sanitizeUserForAudit(existing[0]);
    const isMasterTarget = String(oldAdmin.email || '').toLowerCase() === String(MASTER_ADMIN_EMAIL).toLowerCase();
    if (isMasterTarget) {
      return res.status(403).json({ error: 'Master admin cannot be disapproved.' });
    }

    const [result] = await db.query('UPDATE users SET is_approved = ? WHERE id = ?', [isApproved, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const [updated] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    const newAdmin = updated.length ? sanitizeUserForAudit(updated[0]) : null;

    await logAudit({
      userId: req.userId,
      action: 'admin_approval_update',
      tableName: 'users',
      recordId: id,
      oldData: oldAdmin,
      newData: newAdmin
    });

    res.json({ message: 'Approval status updated', is_approved: isApproved });
  } catch (error) {
    console.error('Approval update error:', error);
    res.status(500).json({ error: 'Failed to update approval status' });
  }
});

router.delete('/admins/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (String(id) === String(req.userId)) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const [existing] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    const oldAdmin = sanitizeUserForAudit(existing[0]);
    const isMasterTarget = String(oldAdmin.email || '').toLowerCase() === String(MASTER_ADMIN_EMAIL).toLowerCase();
    if (isMasterTarget) {
      return res.status(403).json({ error: 'Master admin cannot be deleted.' });
    }

    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    await logAudit({
      userId: req.userId,
      action: 'admin_delete',
      tableName: 'users',
      recordId: id,
      oldData: oldAdmin,
      newData: null
    });

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// Invite a new admin (only specific inviter email)
router.post('/admins/invite', verifyToken, async (req, res) => {
  try {
    if (!transporter) {
      return res.status(500).json({ error: 'Email service is not configured.' });
    }

    const inviterEmail = String(req.userEmail || '').toLowerCase();
    if (inviterEmail !== String(INVITE_ADMIN_EMAIL).toLowerCase()) {
      return res.status(403).json({ error: 'You are not allowed to invite admins.' });
    }

    const email = normalizeEmail(sanitizePlainText(req.body.email || ''));
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const [existing] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An admin with that email already exists.' });
    }

    const tempPassword = crypto.randomBytes(24).toString('hex');
    const hash = await hashPassword(tempPassword);
    const newId = crypto.randomUUID();
    await db.execute(
      'INSERT INTO users (id, email, password_hash, is_approved) VALUES (?, ?, ?, ?)',
      [newId, email, hash, true]
    );

    const { raw, hash: tokenHash } = generateResetToken();
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await db.execute(
      'INSERT INTO password_reset_tokens (id, user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)',
      [tokenId, newId, tokenHash, 'invite', expiresAt]
    );

    const appBaseUrl = getPublicAppUrl();
    const inviteUrl = `${appBaseUrl}/admin/reset-password?token=${raw}`;

    await transporter.sendMail({
      from: `"Bloomway Admin" <${FROM_EMAIL}>`,
      to: email,
      subject: 'You have been invited as an admin',
      text: `Hello, you have been invited as an admin. Set your password here: ${inviteUrl}`,
      html: `<p>Hello,</p><p>You have been invited as an admin. Set your password here:</p><a href="${inviteUrl}">${inviteUrl}</a>`
    });

    await logAudit({
      userId: req.userId,
      action: 'admin_invite',
      tableName: 'users',
      recordId: newId,
      oldData: null,
      newData: { id: newId, email, is_approved: true }
    });

    res.json({ message: 'Invite sent successfully.' });
  } catch (error) {
    console.error('Invite admin error:', error);
    res.status(500).json({ error: 'Failed to send admin invite' });
  }
});

// ====== PASSWORD RESET FLOW ======

// Forgot Password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(sanitizePlainText(req.body.email || ''));
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'No user found with that email.' });
    }

    if (!transporter) {
      return res.status(500).json({ error: 'Email service is not configured.' });
    }

    const user = users[0];
    const { raw, hash: tokenHash } = generateResetToken();
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await db.execute(
      'INSERT INTO password_reset_tokens (id, user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)',
      [tokenId, user.id, tokenHash, 'reset', expiresAt]
    );

    const appBaseUrl = getPublicAppUrl();
    const resetUrl = `${appBaseUrl}/admin/reset-password?token=${raw}`;

    await transporter.sendMail({
      from: `"Bloomway Admin" <${FROM_EMAIL}>`,
      to: user.email,
      subject: 'Password Reset Request',
      text: `Hello, navigate to the following link to reset your password: ${resetUrl}`,
      html: `<p>Hello,</p><p>Navigate to the following link to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`
    });

    res.json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error during password reset request' });
  }
});

// Reset Password
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const token = req.body.token;
    const newPassword = req.body.newPassword;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.ok) {
      return res.status(400).json({ error: passwordCheck.message });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [tokenRows] = await conn.query(
        'SELECT * FROM password_reset_tokens WHERE token_hash = ? FOR UPDATE',
        [tokenHash]
      );
      if (!tokenRows || tokenRows.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Invalid or expired reset link.' });
      }

      const tokenRow = tokenRows[0];
      if (tokenRow.used_at) {
        await conn.rollback();
        return res.status(400).json({ error: 'Reset link has already been used.' });
      }

      const expiresAt = new Date(tokenRow.expires_at);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
        await conn.rollback();
        return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
      }

      const purpose = String(tokenRow.purpose || '');
      if (purpose !== 'reset' && purpose !== 'invite') {
        await conn.rollback();
        return res.status(400).json({ error: 'Invalid token purpose' });
      }

      const [users] = await conn.query('SELECT * FROM users WHERE id = ?', [tokenRow.user_id]);
      if (!users || users.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'User not found' });
      }
      const existingUser = users[0];
      const isReuse = await comparePassword(newPassword, existingUser.password_hash);
      if (isReuse) {
        await conn.rollback();
        return res.status(400).json({ error: 'New password must be different from current password' });
      }

      const hash = await hashPassword(newPassword);
      await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, tokenRow.user_id]);
      await conn.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [tokenRow.id]);
      await conn.commit();

      await logAudit({
        userId: tokenRow.user_id,
        action: purpose === 'invite' ? 'admin_invite_accept' : 'password_reset',
        tableName: 'users',
        recordId: tokenRow.user_id,
        oldData: { password_reset: true },
        newData: { password_reset: true }
      });

      res.json({ message: 'Password has been successfully updated!' });
    } catch (txError) {
      try {
        await conn.rollback();
      } catch (rollbackErr) {
        console.error('Reset password rollback error:', rollbackErr);
      }
      console.error('Reset password error:', txError);
      res.status(500).json({ error: 'Server error during password reset' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

// Get Contact Messages
router.get('/messages', verifyToken, async (req, res) => {
  try {
    const [messages] = await db.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Server error while retrieving messages' });
  }
});

// Delete a contact message
router.delete('/messages/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT * FROM contact_messages WHERE id = ?', [id]);
    const oldMessage = existing && existing.length ? existing[0] : null;

    const [result] = await db.query('DELETE FROM contact_messages WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await logAudit({
      userId: req.userId,
      action: 'contact_message_delete',
      tableName: 'contact_messages',
      recordId: id,
      oldData: oldMessage,
      newData: null
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Server error while deleting message' });
  }
});

// ====== CMS ROUTES ======

// Rate limit all /media operations explicitly (in addition to global /api limiter)
router.use('/media', mediaLimiter);

// Get all pages with sections and blocks
router.get('/pages', verifyToken, async (req, res) => {
  try {
    const [pages] = await db.query('SELECT * FROM pages ORDER BY created_at ASC');
    const [sections] = await db.query('SELECT * FROM sections ORDER BY sort_order ASC');
    const [blocks] = await db.query('SELECT b.*, m.file_path as media_url FROM content_blocks b LEFT JOIN media_assets m ON b.media_asset_id = m.id');

    // Nest them
    const structuredPages = pages.map(page => {
      const pageSections = sections.filter(s => s.page_id === page.id).map(section => {
        const sectionBlocks = blocks.filter(b => b.section_id === section.id);
        return { ...section, blocks: sectionBlocks };
      });
      return { ...page, sections: pageSections };
    });

    res.json(structuredPages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// Update a specific block
router.put('/blocks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const textValue = typeof req.body.text_value === 'string'
      ? sanitizeHtml(req.body.text_value)
      : null;
    const mediaAssetId = req.body.media_asset_id || null;

    const [existing] = await db.query('SELECT * FROM content_blocks WHERE id = ?', [id]);
    const oldBlock = existing && existing.length ? existing[0] : null;

    await db.query(
      'UPDATE content_blocks SET text_value = ?, media_asset_id = ? WHERE id = ?',
      [textValue, mediaAssetId, id]
    );

    const [updated] = await db.query('SELECT * FROM content_blocks WHERE id = ?', [id]);
    const newBlock = updated && updated.length ? updated[0] : null;

    await logAudit({
      userId: req.userId,
      action: 'content_block_update',
      tableName: 'content_blocks',
      recordId: id,
      oldData: oldBlock,
      newData: newBlock
    });

    res.json({ message: 'Block updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update block' });
  }
});

// Get media assets
router.get('/media', verifyToken, async (req, res) => {
  try {
    const [media] = await db.query('SELECT * FROM media_assets ORDER BY created_at DESC');
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// Delete a media asset
router.delete('/media/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM media_assets WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Media asset not found' });
    }

    const asset = rows[0];
    const storedName = path.basename(asset.file_path || '');
    const fileOnDisk = path.join(uploadDir, storedName);

    // Detach from content blocks first (defensive even with FK)
    await db.query('UPDATE content_blocks SET media_asset_id = NULL WHERE media_asset_id = ?', [id]);

    // Remove DB record
    await db.query('DELETE FROM media_assets WHERE id = ?', [id]);

    await logAudit({
      userId: req.userId,
      action: 'media_delete',
      tableName: 'media_assets',
      recordId: id,
      oldData: asset,
      newData: null
    });

    // Remove file from disk (best effort)
    if (storedName && uploadsEnabled) {
      fs.unlink(fileOnDisk, (err) => {
        if (err) {
          console.warn('Failed to remove media file:', err.message);
        }
      });
    }

    res.json({ message: 'Media asset deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete media asset' });
  }
});

// Add external media asset by URL (for static hosting workflows)
router.post('/media/external', verifyToken, async (req, res) => {
  try {
    const fileUrlRaw = sanitizePlainText(req.body.file_url || '');
    const fileNameRaw = sanitizePlainText(req.body.file_name || '');

    if (!fileUrlRaw) {
      return res.status(400).json({ error: 'file_url is required' });
    }

    let parsed;
    try {
      parsed = new URL(fileUrlRaw);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only http and https URLs are allowed' });
    }

    const ext = path.extname(parsed.pathname || '').toLowerCase();
    const mimeType = MIME_BY_EXT[ext];
    if (!mimeType) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and WEBP are allowed.' });
    }

    const safeName = (fileNameRaw || path.basename(parsed.pathname || '') || 'external-image').slice(0, 255);
    const newId = crypto.randomUUID();

    await db.query(
      'INSERT INTO media_assets (id, file_name, file_path, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)',
      [newId, safeName, parsed.toString(), mimeType, 0]
    );

    await logAudit({
      userId: req.userId,
      action: 'media_external_add',
      tableName: 'media_assets',
      recordId: newId,
      oldData: null,
      newData: {
        id: newId,
        file_name: safeName,
        file_path: parsed.toString(),
        mime_type: mimeType,
        size_bytes: 0
      }
    });

    res.status(201).json({ message: 'External media added successfully', asset_id: newId, file_path: parsed.toString() });
  } catch (error) {
    console.error('Add external media error:', error);
    res.status(500).json({ error: 'Failed to add external media' });
  }
});

// Upload new media asset
const uploadImageMiddleware = (req, res, next) => {
  if (!uploadsEnabled || !upload) {
    return res.status(503).json({ error: 'Uploads are disabled in this environment.' });
  }
  return upload.single('image')(req, res, next);
};

router.post('/media', verifyToken, uploadImageMiddleware, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const newId = crypto.randomUUID();
    const filePath = `/uploads/${req.file.filename}`;
    const storedName = req.file.filename;

    await db.query(
      'INSERT INTO media_assets (id, file_name, file_path, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)',
      [newId, storedName, filePath, req.file.mimetype, req.file.size]
    );

    await logAudit({
      userId: req.userId,
      action: 'media_upload',
      tableName: 'media_assets',
      recordId: newId,
      oldData: null,
      newData: {
        id: newId,
        file_name: storedName,
        file_path: filePath,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size
      }
    });

    res.status(201).json({ message: 'Image uploaded successfully', asset_id: newId, file_path: filePath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

// Multer error handler for uploads
router.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Max size is 5MB.' });
  }
  if (err && err.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and WEBP are allowed.' });
  }
  return next(err);
});

module.exports = router;
