const { Blog, BLOG_STATUS } = require('../models/schemas');
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

/**
 * Get all published blogs (SSR-friendly list page)
 */
const getPublishedBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({
      status: BLOG_STATUS.PUBLISHED,
    })
      .sort({ publishedAt: -1 })
      .select(
        'title subTitle content coverImage tags publishedAt createdAt updatedAt slug'
      );

      const finalBlogs = blogs.map(blog => {
      const blogObj = blog.toObject();

      // remove _id from content blocks
      blogObj.content = sanitizeContentForResponse(blogObj.content);

      // build SSR-friendly HTML string
      blogObj.contentString = buildContentString(blogObj.content);

      return blogObj;
    });

    return res.status(200).json({
      success: true,
      data: finalBlogs,
    });
  } catch (error) {
    console.error('Public get blogs error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
    });
  }
};

/**
 * Get single published blog by slug (SSR detail page)
 */
const getPublishedBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({
      slug,
      status: BLOG_STATUS.PUBLISHED,
    }).select(
      'title subTitle content coverImage tags publishedAt createdAt updatedAt slug'
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    const blogObj = blog.toObject();

    // sanitize content blocks
    blogObj.content = sanitizeContentForResponse(blogObj.content);

    // build contentString
    blogObj.contentString = buildContentString(blogObj.content);

    return res.status(200).json({
      success: true,
      data: blogObj,
    });
  } catch (error) {
    console.error('Public get blog error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blog',
    });
  }
};

module.exports = {
  getPublishedBlogs,
  getPublishedBlogBySlug,
};
