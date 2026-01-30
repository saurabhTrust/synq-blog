const { Blog, BLOG_STATUS } = require('../models/schemas');

/**
 * =========================
 * GET ALL PUBLISHED BLOGS
 * (Public / CSR / Mobile)
 * =========================
 * ❗ Returns STRING content only
 */
const getPublishedBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({
      status: BLOG_STATUS.PUBLISHED,
    })
      .sort({ publishedAt: -1 })
      .select(
        'title subTitle content coverImage tags status publishedAt createdAt updatedAt'
      );

    const finalBlogs = blogs.map(blog => {
      const blogObj = blog.toObject();

      return {
        _id: blogObj._id,
        title: blogObj.title,
        subTitle: blogObj.subTitle,

        // ✅ STRING — NO TRANSFORMATION
        content: blogObj.content || '',

        coverImage: blogObj.coverImage,
        tags: blogObj.tags,
        status: blogObj.status,
        publishedAt: blogObj.publishedAt,
        createdAt: blogObj.createdAt,
        updatedAt: blogObj.updatedAt,
      };
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
 * =========================
 * GET PUBLISHED BLOG BY SLUG
 * (Public / CSR / Mobile)
 * =========================
 * ❗ Returns STRING content only
 */
const getPublishedBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({
      slug,
      status: BLOG_STATUS.PUBLISHED,
    }).select(
      'title subTitle content coverImage tags status publishedAt createdAt updatedAt'
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    const blogObj = blog.toObject();

    return res.status(200).json({
      success: true,
      message: 'Blog fetched successfully',
      data: {
        _id: blogObj._id,
        title: blogObj.title,
        subTitle: blogObj.subTitle,

        // ✅ STRING — NO TRANSFORMATION
        content: blogObj.content || '',

        coverImage: blogObj.coverImage,
        tags: blogObj.tags,
        status: blogObj.status,
        publishedAt: blogObj.publishedAt,
        createdAt: blogObj.createdAt,
        updatedAt: blogObj.updatedAt,
      },
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
