const { Blog, BLOG_STATUS } = require('../models/schemas');
const { uploadToStorage } = require('../services/ipfs');
const {
  sanitizeContentForResponse,
  buildContentString,
} = require('../utils/blog');

/**
 * =========================
 * CREATE DRAFT BLOG
 * =========================
 */
const createDraftBlog = async (req, res) => {
  try {
    const { title, subTitle, content, tags, coverImage } = req.body || {};

    // =========================
    // Validation
    // =========================
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    // =========================
    // Parse tags
    // =========================
    const parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
        ? tags.split(',').map(t => t.trim())
        : [];

    // =========================
    // Create draft blog
    // =========================
    const blog = await Blog.create({
      title,
      subTitle,

      // ✅ CONTENT FIX (STRING ONLY, SAFE DEFAULT)
      content: typeof content === 'string' ? content : '',

      coverImage: coverImage || null,
      tags: parsedTags,
      status: BLOG_STATUS.DRAFT,
    });

    // =========================
    // Prepare response
    // =========================
    const blogObj = blog.toObject();

    return res.status(201).json({
      success: true,
      message: 'Blog saved as draft',
      data: {
        _id: blogObj._id,

        title: blogObj.title,
        subTitle: blogObj.subTitle,

        // ✅ CONTENT RETURNED DIRECTLY (NO PLACEHOLDERS, NO TRANSFORM)
        content: blogObj.content,

        coverImage: blogObj.coverImage,
        tags: blogObj.tags,

        status: blogObj.status,
        publishedAt: blogObj.publishedAt,

        createdAt: blogObj.createdAt,
        updatedAt: blogObj.updatedAt,
      },
    });
  } catch (error) {
    console.error('Create draft error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create draft blog',
    });
  }
};



/**
 * =========================
 * PUBLISH BLOG
 * =========================
 */
const publishBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { title, subTitle, content, tags, coverImage } = req.body || {};

    let blog;

    /**
     * ===============================
     * CASE 1: Publish existing draft
     * ===============================
     */
    if (blogId) {
      blog = await Blog.findById(blogId);

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: 'Draft blog not found',
        });
      }

      if (blog.status === BLOG_STATUS.PUBLISHED) {
        return res.status(400).json({
          success: false,
          message: 'Blog already published',
        });
      }

      // ✅ update content if provided (string only)
      if (typeof content === 'string') {
        blog.content = content;
      }

      blog.status = BLOG_STATUS.PUBLISHED;
      blog.publishedAt = new Date();
      await blog.save();
    }

    /**
     * =================================
     * CASE 2: Direct publish (NO blogId)
     * =================================
     */
    else {
      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title is required to publish',
        });
      }

      const parsedTags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
          ? tags.split(',').map(t => t.trim())
          : [];

      blog = await Blog.create({
        title,
        subTitle,
        content: typeof content === 'string' ? content : '', // ✅ STRING ONLY
        coverImage: coverImage || null,
        tags: parsedTags,
        status: BLOG_STATUS.PUBLISHED,
        publishedAt: new Date(),
      });
    }

    /**
     * =========================
     * RESPONSE (NO TRANSFORM)
     * =========================
     */
    const blogObj = blog.toObject();

    return res.status(200).json({
      success: true,
      message: 'Blog published successfully',
      data: {
        _id: blogObj._id,

        title: blogObj.title,
        subTitle: blogObj.subTitle,

        content: blogObj.content, // ✅ RAW STRING

        coverImage: blogObj.coverImage,
        tags: blogObj.tags,

        status: blogObj.status,
        publishedAt: blogObj.publishedAt,

        createdAt: blogObj.createdAt,
        updatedAt: blogObj.updatedAt,
      },
    });
  } catch (error) {
    console.error('Publish blog error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to publish blog',
    });
  }
};



/**
 * =========================
 * UPDATE BLOG (DRAFT or PUBLISHED)
 * =========================
 */
const updateBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { title, subTitle, content, tags, coverImage } = req.body || {};

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    /**
     * =========================
     * Update basic fields
     * =========================
     */
    if (title !== undefined) blog.title = title;
    if (subTitle !== undefined) blog.subTitle = subTitle;

    /**
     * =========================
     * Update cover image
     * =========================
     */
    if (coverImage !== undefined) {
      blog.coverImage = coverImage;
    }

    /**
     * =========================
     * Update tags
     * =========================
     */
    if (tags !== undefined) {
      blog.tags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
          ? tags.split(',').map(t => t.trim())
          : blog.tags;
    }

    /**
     * =========================
     * Update content (STRING ONLY)
     * =========================
     */
    if (content !== undefined) {
      blog.content = typeof content === 'string' ? content : '';
    }

    await blog.save();

    /**
     * =========================
     * Response (RAW STRING)
     * =========================
     */
    const blogObj = blog.toObject();

    return res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: {
        _id: blogObj._id,

        title: blogObj.title,
        subTitle: blogObj.subTitle,

        content: blogObj.content, // ✅ STRING AS-IS

        coverImage: blogObj.coverImage,
        tags: blogObj.tags,

        status: blogObj.status,
        publishedAt: blogObj.publishedAt,

        createdAt: blogObj.createdAt,
        updatedAt: blogObj.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update blog error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update blog',
    });
  }
};



/**
 * =========================
 * GET ALL BLOGS (ADMIN)
 * =========================
 */
const getAllBlogs = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status && Object.values(BLOG_STATUS).includes(status)) {
      filter.status = status;
    }

    const blogs = await Blog.find(filter)
      .sort({ createdAt: -1 })
      .select(
        'title subTitle content coverImage tags status publishedAt createdAt updatedAt'
      );

    const responseBlogs = blogs.map(blog => {
      const blogObj = blog.toObject();

      return {
        _id: blogObj._id,

        title: blogObj.title,
        subTitle: blogObj.subTitle,

        // ✅ STRING ONLY (NO processing)
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
      count: responseBlogs.length,
      data: responseBlogs,
    });
  } catch (error) {
    console.error('Get blogs error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
    });
  }
};



const { renderArticleHtml } = require('../utils/blogRenderer');

const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.blogId);

    if (!blog) {
      return res.status(404).send('Blog not found');
    }

    const blogObj = blog.toObject();

    // Build full HTML (article + layout)
    const html = renderArticleHtml({
      title: blogObj.title,
      subTitle: blogObj.subTitle,

      // ✅ STRING CONTENT DIRECTLY
      content: blogObj.content || '',

      coverImage: blogObj.coverImage,
      tags: blogObj.tags,
      publishedAt: blogObj.publishedAt,
      status: blogObj.status,
    });

    res.setHeader('Content-Type', 'text/html');

    return res.status(200).send(html);
  } catch (err) {
    console.error('Get blog by ID error:', err.message);
    return res.status(500).send('Failed to fetch blog');
  }
};




/**
 * =========================
 * DELETE BLOG
 * =========================
 */
const deleteBlog = async (req, res) => {
  try {
    const { blogId } = req.params;

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Soft delete: published → draft
    if (blog.status === BLOG_STATUS.PUBLISHED) {
      blog.status = BLOG_STATUS.DRAFT;
      blog.publishedAt = null;
      await blog.save();

      return res.status(200).json({
        success: true,
        message: 'Blog unpublished and moved to draft',
      });
    }

    // Hard delete: draft
    if (blog.status === BLOG_STATUS.DRAFT) {
      await Blog.deleteOne({ _id: blogId });

      return res.status(200).json({
        success: true,
        message: 'Draft blog permanently deleted',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid blog state',
    });
  } catch (error) {
    console.error('Delete blog error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete blog',
    });
  }
};


module.exports = {
  createDraftBlog,
  publishBlog,
  updateBlog,
  getAllBlogs,
  getBlogById,
  deleteBlog,
};
