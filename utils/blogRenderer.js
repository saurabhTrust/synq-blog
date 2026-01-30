const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// escape text for safety (kept for future use, not removed)
const escapeHtml = (str = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Render full article HTML using handlebars
 * content = STRING (HTML or plain text)
 */
const renderArticleHtml = ({ title, subTitle, content }) => {
  const baseTemplate = fs.readFileSync(
    path.join(__dirname, '../views/layouts/base.hbs'),
    'utf8'
  );

  const articleTemplate = fs.readFileSync(
    path.join(__dirname, '../views/article.hbs'),
    'utf8'
  );

  const articleHtml = Handlebars.compile(articleTemplate)({
    title,
    subTitle,
    content: content || '', // ✅ DIRECT STRING PASS (safe fallback)
  });

  const finalHtml = Handlebars.compile(baseTemplate)({
    title,
    body: articleHtml,
  });

  return finalHtml;
};

module.exports = {
  renderArticleHtml,
};
