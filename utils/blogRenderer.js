const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');

const baseTemplate = fs.readFileSync(
  path.join(__dirname, '../views/layouts/base.hbs'),
  'utf8'
);

const listTemplate = fs.readFileSync(
  path.join(__dirname, '../views/blogList.hbs'),
  'utf8'
);

const articleTemplate = fs.readFileSync(
  path.join(__dirname, '../views/article.hbs'),
  'utf8'
);

const base = Handlebars.compile(baseTemplate);
const list = Handlebars.compile(listTemplate);
const article = Handlebars.compile(articleTemplate);

/**
 * ✅ Extract CID from ipfs://CID
 */
function extractIpfsCid(url) {
  if (!url) return null;
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', '');
  }
  return null;
}

/**
 * ✅ BLOG LIST SSR
 */
function renderBlogListHtml({ blogs }) {
  // 🔥 NORMALIZE blogs for template
  const normalizedBlogs = blogs.map(blog => ({
    ...blog,
    coverImageCid: extractIpfsCid(blog.coverImage),
  }));

  const firstBlog = normalizedBlogs[0] || {};

  const body = list({ blogs: normalizedBlogs });

  return base({
    meta: {
      title: firstBlog.title || 'SynQ Social Blogs',
      subTitle: firstBlog.subTitle || '',
      tags: (firstBlog.tags || []).join(' ')
    },
    body,
  });
}
/**
 * ✅ SINGLE ARTICLE SSR
 */
function renderArticleHtml({ title, subTitle, content, coverImage }) {
  const body = article({
    title,
    subTitle,
    content,
    coverImageCid: extractIpfsCid(coverImage),
  });

  return base({
    title,
    body,
  });
}

module.exports = {
  renderBlogListHtml,
  renderArticleHtml,
};
