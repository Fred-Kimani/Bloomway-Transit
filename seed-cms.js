const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

async function seedCMS() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bloomway-transit'
  });

  try {
    const [existingPages] = await connection.query('SELECT * FROM pages WHERE slug = ?', ['home']);
    let pageId;
    if (existingPages.length > 0) {
      pageId = existingPages[0].id;
    } else {
      pageId = crypto.randomUUID();
      await connection.query('INSERT INTO pages (id, slug, title) VALUES (?, ?, ?)', [pageId, 'home', 'Home']);
    }

    const sectionDefs = [
      { name: 'hero', sort_order: 1 },
      { name: 'about', sort_order: 2 },
      { name: 'services', sort_order: 3 },
      { name: 'contact', sort_order: 4 }
    ];

    const sectionIds = {};
    for (const section of sectionDefs) {
      const [rows] = await connection.query(
        'SELECT id FROM sections WHERE page_id = ? AND name = ?',
        [pageId, section.name]
      );
      if (rows.length > 0) {
        sectionIds[section.name] = rows[0].id;
      } else {
        const newId = crypto.randomUUID();
        await connection.query(
          'INSERT INTO sections (id, page_id, name, sort_order) VALUES (?, ?, ?, ?)',
          [newId, pageId, section.name, section.sort_order]
        );
        sectionIds[section.name] = newId;
      }
    }

    const mediaDefs = [
      { file_name: 'bloomwaylogo.png', file_path: '/bloomwaylogo.png', mime_type: 'image/png', size_bytes: 1024 },
      { file_name: 'shelfstocking.jpg', file_path: '/shelfstocking.jpg', mime_type: 'image/jpeg', size_bytes: 1024 },
      { file_name: 'truckloading.jpeg', file_path: '/truckloading.jpeg', mime_type: 'image/jpeg', size_bytes: 1024 },
      { file_name: 'wecare.jpeg', file_path: '/wecare.jpeg', mime_type: 'image/jpeg', size_bytes: 1024 }
    ];

    const mediaIds = {};
    for (const asset of mediaDefs) {
      const [rows] = await connection.query('SELECT id FROM media_assets WHERE file_path = ?', [asset.file_path]);
      if (rows.length > 0) {
        mediaIds[asset.file_path] = rows[0].id;
      } else {
        const newId = crypto.randomUUID();
        await connection.query(
          'INSERT INTO media_assets (id, file_name, file_path, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)',
          [newId, asset.file_name, asset.file_path, asset.mime_type, asset.size_bytes]
        );
        mediaIds[asset.file_path] = newId;
      }
    }

    const blocks = [
      // Hero
      { section: 'hero', block_key: 'eyebrow', content_type: 'text', text_value: 'Bloomway Transit' },
      { section: 'hero', block_key: 'heading', content_type: 'text', text_value: 'Delivering what matters most.' },
      { section: 'hero', block_key: 'lead', content_type: 'text', text_value: 'Secure deliveries and peace of mind.' },
      { section: 'hero', block_key: 'body', content_type: 'text', text_value: 'We go beyond traditional courier services by creating a seamless, dependable experience that prioritizes both patient well-being and healthcare efficiency.' },
      { section: 'hero', block_key: 'image', content_type: 'image', media_asset_id: mediaIds['/bloomwaylogo.png'] },

      // About
      { section: 'about', block_key: 'eyebrow', content_type: 'text', text_value: 'About Bloomway' },
      { section: 'about', block_key: 'heading', content_type: 'text', text_value: 'About Us' },
      { section: 'about', block_key: 'body_main', content_type: 'text', text_value: 'Bloomway Transit is a medical courier company inspired by real experiences in healthcare and caregiving. From urgent blood deliveries that saved lives to moments when missing a prescription nearly put a patient at risk, we’ve seen how critical reliable logistics are. With a focus on precision and professionalism, we specialize in delivering lab specimens, prescriptions, medical supplies, and other essential healthcare items. Every delivery is handled with care and urgency, because in healthcare, reliability isn’t just important — it can make all the difference.' },
      { section: 'about', block_key: 'subhead_1', content_type: 'text', text_value: 'Statement of Purpose' },
      { section: 'about', block_key: 'body_1', content_type: 'text', text_value: 'At Bloomway Transit, our purpose is to build trust and deliver peace of mind through every delivery. By providing secure and reliable medical courier services, we strive to exceed expectations and ensure that every shipment supports better patient care.' },
      { section: 'about', block_key: 'subhead_2', content_type: 'text', text_value: 'Vision' },
      { section: 'about', block_key: 'body_2', content_type: 'text', text_value: 'Guided by this purpose, our vision is to create a future where every delivery fulfills that promise — ensuring vital medical items reach their destination safely and on time. We aim to be the trusted courier partner healthcare providers and communities rely on.' },
      { section: 'about', block_key: 'image', content_type: 'image', media_asset_id: mediaIds['/shelfstocking.jpg'] },

      // Services
      { section: 'services', block_key: 'eyebrow', content_type: 'text', text_value: 'Services' },
      { section: 'services', block_key: 'heading', content_type: 'text', text_value: 'Flexible coverage.' },
      { section: 'services', block_key: 'service_1_title', content_type: 'text', text_value: 'Medical Courier Services' },
      { section: 'services', block_key: 'service_1_body', content_type: 'text', text_value: 'Fast, secure delivery of medical supplies, lab work, prescriptions, and equipment. We ensure every item reaches its destination safely and on time, handled with the care healthcare providers expect.' },
      { section: 'services', block_key: 'service_2_title', content_type: 'text', text_value: 'Logistics Coordination' },
      { section: 'services', block_key: 'service_2_body', content_type: 'text', text_value: 'With smart scheduling and optimized routes, we make sure lab specimens, prescriptions, and medical supplies are delivered on time, every time. From dispatch to delivery, we focus on efficiency so providers and patients can focus on care.' },
      { section: 'services', block_key: 'service_3_title', content_type: 'text', text_value: 'Specialized Transport Solutions' },
      { section: 'services', block_key: 'service_3_body', content_type: 'text', text_value: 'Custom solutions for unique needs, including temperature-sensitive deliveries and fragile medical equipment. Whatever the challenge, Bloomway Transit adapts to deliver with precision and care.' },
      { section: 'services', block_key: 'service_4_title', content_type: 'text', text_value: 'On-Demand Services' },
      { section: 'services', block_key: 'service_4_body', content_type: 'text', text_value: 'Flexible and responsive on-demand services for urgent medical transport needs, providing quick and reliable solutions to support healthcare providers and patients in critical situations.' },
      { section: 'services', block_key: 'image', content_type: 'image', media_asset_id: mediaIds['/truckloading.jpeg'] },

      // Contact (Beyond Delivery + Let's Connect)
      { section: 'contact', block_key: 'wecare_image', content_type: 'image', media_asset_id: mediaIds['/wecare.jpeg'] },
      { section: 'contact', block_key: 'wecare_heading', content_type: 'text', text_value: 'Beyond Delivery, we care' },
      { section: 'contact', block_key: 'wecare_body1', content_type: 'text', text_value: 'At Bloomway Transit, we believe every delivery is more than just logistics — it’s a promise kept. With precision, care, and reliability at our core, we combine professionalism with compassion to serve healthcare providers and communities.' },
      { section: 'contact', block_key: 'wecare_body2', content_type: 'text', text_value: 'We go beyond traditional courier services by creating a seamless, dependable experience that prioritizes both patient well-being and healthcare efficiency. Our commitment is simple: to be a trusted partner in medical logistics, delivering peace of mind one delivery at a time.' },
      { section: 'contact', block_key: 'connect_eyebrow', content_type: 'text', text_value: 'Let’s Connect' },
      { section: 'contact', block_key: 'connect_body', content_type: 'text', text_value: 'We’d love to hear from you. Whether you have a question, need a quote, or want to discuss a partnership, our team is here to help. At Bloomway Transit, your convenience and peace of mind come first.' }
    ];

    for (const block of blocks) {
      const sectionId = sectionIds[block.section];
      if (!sectionId) continue;
      const [existing] = await connection.query(
        'SELECT id FROM content_blocks WHERE section_id = ? AND block_key = ?',
        [sectionId, block.block_key]
      );
      if (existing.length === 0) {
        await connection.query(
          'INSERT INTO content_blocks (id, section_id, block_key, content_type, text_value, media_asset_id) VALUES (?, ?, ?, ?, ?, ?)',
          [
            crypto.randomUUID(),
            sectionId,
            block.block_key,
            block.content_type,
            block.text_value || null,
            block.media_asset_id || null
          ]
        );
      }
    }

    console.log('CMS seeded/updated successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

seedCMS();
