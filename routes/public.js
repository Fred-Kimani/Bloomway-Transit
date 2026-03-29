const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { csrfProtection, contactLimiter } = require('../middleware/security');
const { sanitizePlainText } = require('../utils/sanitize');
const { normalizeEmail, isValidEmail } = require('../utils/auth');

// Apply CSRF protection to all state-changing routes.
router.use(csrfProtection);

// Get all public pages with nested CMS blocks
router.get('/pages', async (req, res) => {
  try {
    const [pages] = await db.query('SELECT * FROM pages WHERE is_published = true ORDER BY created_at ASC');
    const [sections] = await db.query('SELECT * FROM sections ORDER BY sort_order ASC');
    const [blocks] = await db.query('SELECT b.*, m.file_path as media_url FROM content_blocks b LEFT JOIN media_assets m ON b.media_asset_id = m.id');

    // Nest them into associative mappings instead of arrays for constant O(1) React lookup
    const structuredPages = pages.map(page => {
      const sectionMap = {};
      sections.filter(s => s.page_id === page.id).forEach(section => {
        const sectionBlocks = blocks.filter(b => b.section_id === section.id);
        const blockMap = {};
        sectionBlocks.forEach(b => {
          blockMap[b.block_key] = b; 
        });
        sectionMap[section.name] = { ...section, blocks: blockMap };
      });
      return { ...page, sections: sectionMap };
    });

    res.json(structuredPages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch public pages' });
  }
});

// Submit a contact form message
router.post('/contact', contactLimiter, async (req, res) => {
  try {
    const name = sanitizePlainText(req.body.name);
    const contactMethod = sanitizePlainText(req.body.contactMethod);
    const email = normalizeEmail(sanitizePlainText(req.body.email || ''));
    const phone = sanitizePlainText(req.body.phone || '');
    const message = sanitizePlainText(req.body.message);

    if (!name || !contactMethod || !message) {
      return res.status(400).json({ error: 'Name, contact method, and message are required.' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message exceeds the maximum limit of 1000 characters.' });
    }

    if (contactMethod === 'email') {
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'A valid email is required.' });
      }
    }

    const newId = crypto.randomUUID();

    await db.execute(
      'INSERT INTO contact_messages (id, name, contact_method, email, phone, message) VALUES (?, ?, ?, ?, ?, ?)',
      [newId, name, contactMethod, email || null, phone || null, message]
    );

    res.status(201).json({ message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({ error: 'Server error during submission' });
  }
});

module.exports = router;
