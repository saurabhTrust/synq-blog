const { Blog, BLOG_STATUS } = require('../models/schemas');

/**
 * Get all published blogs (SSR-friendly)
 */
const getPublishedBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({
      status: BLOG_STATUS.PUBLISHED,
    })
      .sort({ publishedAt: -1 })
      .select(
        'title subTitle description coverImage tags publishedAt slug'
      );

    return res.status(200).json({
      success: true,
      data: blogs,
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
 * Get single published blog by slug (SSR page)
 */
const getPublishedBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({
      slug,
      status: BLOG_STATUS.PUBLISHED,
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: blog,
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
