// Vercel has a read-only filesystem (except /tmp), so we must disable local disk uploads
process.env.UPLOADS_ENABLED = 'false';

const app = require('../app');

// Vercel serverless functions explicitly rely on exporting the Express instance
module.exports = app;
