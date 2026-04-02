const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const { csrfErrorHandler, apiLimiter } = require('./middleware/security');

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const isMaintenanceMode = String(process.env.MAINTENANCE_MODE || '').toLowerCase() === 'true';
const serveFrontend = String(process.env.SERVE_FRONTEND || 'false').toLowerCase() === 'true';
const serveUploads = String(process.env.SERVE_UPLOADS || 'false').toLowerCase() === 'true';
const enableCsp = String(process.env.ENABLE_CSP || 'true').toLowerCase() === 'true';
const cspReportOnly = String(process.env.CSP_REPORT_ONLY || 'true').toLowerCase() === 'true';

function requireEnv(name) {
  const value = process.env[name];
  if (isProd && (!value || String(value).trim() === '')) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Hard fail early in production if critical env vars are missing
requireEnv('JWT_SECRET');
requireEnv('DB_HOST');
requireEnv('DB_PORT');
requireEnv('DB_USER');
requireEnv('DB_PASSWORD');
requireEnv('DB_NAME');
requireEnv('CORS_ORIGIN');
requireEnv('PUBLIC_APP_URL');
requireEnv('SMTP_USER');
requireEnv('SMTP_PASS');

if (isProd) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use(helmet({
  // CSP is intentionally configurable/report-only by default to allow phased rollout.
  contentSecurityPolicy: enableCsp ? {
    useDefaults: true,
    reportOnly: cspReportOnly,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  } : false,
}));

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173', 'https://www.bloomwaytransit.com', 'http://www.bloomwaytransit.com', 'http://bloomwaytransit.com'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsOrigin.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Production traffic must come through HTTPS (Render/Proxy sends x-forwarded-proto).
app.use((req, res, next) => {
  if (!isProd) return next();
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const isSecureRequest = forwardedProto === 'https' || req.secure === true;
  if (!isSecureRequest) {
    return res.status(400).json({ error: 'HTTPS is required in production.' });
  }
  return next();
});

// Maintenance mode: show under-construction page for public site
if (serveFrontend) {
  app.use((req, res, next) => {
    if (!isMaintenanceMode) return next();
    const pathLower = req.path.toLowerCase();
    if (
      pathLower.startsWith('/api') ||
      pathLower.startsWith('/admin') ||
      pathLower.startsWith('/uploads') ||
      pathLower.match(/\.(png|jpe?g|gif|svg|webp|ico)$/i)
    ) {
      return next();
    }
    res.setHeader('Retry-After', '3600');
    return res.status(503).sendFile(path.join(__dirname, 'maintenance.html'));
  });
}

// API Routes
app.use('/api', apiLimiter);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);

// Serve uploaded CMS images statically (local mode only)
if (serveUploads) {
  app.use('/uploads', (req, res, next) => {
    const allowed = /\.(png|jpe?g|webp)$/i;
    if (!allowed.test(req.path)) {
      return res.status(404).end();
    }
    return next();
  });
  app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    fallthrough: true,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }));
}

// Static frontend delivery (local mode only)
if (serveFrontend) {
  app.use(express.static(path.join(__dirname, 'frontend', 'dist')));
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  });
}

// CSRF error handler
app.use(csrfErrorHandler);

module.exports = app;
