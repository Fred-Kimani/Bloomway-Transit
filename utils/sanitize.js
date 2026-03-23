const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

function sanitizeHtml(input) {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { USE_PROFILES: { html: true } });
}

function sanitizePlainText(input) {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

module.exports = {
  sanitizeHtml,
  sanitizePlainText,
};
