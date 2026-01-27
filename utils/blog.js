const sanitizeContentForResponse = (content = []) => {
  return content.map(({ _id, ...rest }) => rest);
};


// Escape HTML to prevent XSS
const escapeHtml = (str = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// Convert content blocks → render-ready HTML string
const buildContentString = (content = []) => {
  return content
    .map(block => {
      if (block.type === 'text') {
        return `<p>${escapeHtml(block.value)}</p>`;
      }

      if (block.type === 'image') {
        return `<img src="${block.value}" alt="content-image" loading="lazy" />`;
      }

      return '';
    })
    .join('');
};

module.exports = {
  sanitizeContentForResponse,
  buildContentString,
};