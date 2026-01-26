const { Blog, BLOG_STATUS } = require('../models/schemas');
const { uploadToStorage } = require('../services/ipfs');
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
 * =========================
 * CREATE DRAFT BLOG
 * =========================
 */
const createDraftBlog = async (req, res) => {
  try {
    const { title, subTitle, content, tags } = req.body || {};

    // =========================
    // Validation
    // =========================
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    // =========================
    // Upload cover image to IPFS
    // =========================
    const coverImageData = req.files?.coverImage?.[0]
      ? await uploadToStorage(req.files.coverImage[0])
      : null;

    // =========================
    // Parse tags
    // =========================
    const parsedTags =
      typeof tags === 'string'
        ? tags.split(',').map(t => t.trim())
        : [];

    // =========================
    // Parse content safely
    // =========================
    let parsedContent;

    try {
      const parsed = JSON.parse(content);
      parsedContent = Array.isArray(parsed)
        ? parsed
        : [{ type: 'text', value: content }];
    } catch {
      parsedContent = [{ type: 'text', value: content }];
    }

    // =========================
    // Upload content images to IPFS
    // =========================
    const contentImageMap = {};

    if (req.files?.contentImages?.length) {
      for (let i = 0; i < req.files.contentImages.length; i++) {
        const file = req.files.contentImages[i];
        const uploaded = await uploadToStorage(file);

        // Placeholder key must match frontend
        contentImageMap[`contentImages[${i}]`] = uploaded.ipfsUri;
      }
    }

    // =========================
    // Inject IPFS URLs into content
    // =========================
    const finalContent = parsedContent.map(block => {
      if (block.type === 'image') {
        return {
          type: 'image',
          value: contentImageMap[block.value] || block.value,
        };
      }
      return block;
    });

    // =========================
    // Create draft blog
    // =========================
    const blog = await Blog.create({
      title,
      subTitle,
      content: finalContent,
      coverImage: coverImageData?.ipfsUri || null,
      tags: parsedTags,
      status: BLOG_STATUS.DRAFT,
    });

    // =========================
    // Prepare response
    // =========================
    const blogObj = blog.toObject();

    blogObj.content = sanitizeContentForResponse(blogObj.content);
    blogObj.contentString = buildContentString(blogObj.content);

    return res.status(201).json({
      success: true,
      message: 'Blog saved as draft',
      data: blogObj,
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
    const { title, subTitle, content, tags } = req.body || {};

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

      blog.status = BLOG_STATUS.PUBLISHED;
      blog.publishedAt = new Date();
      await blog.save();
    }

    /**
     * =================================
     * CASE 2: Direct publish (no draft)
     * =================================
     */
    else {
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Title and content are required to publish',
        });
      }

      /**
       * Upload cover image
       */
      const coverImageData = req.files?.coverImage?.[0]
        ? await uploadToStorage(req.files.coverImage[0])
        : null;

      /**
       * Parse tags
       */
      const parsedTags =
        typeof tags === 'string'
          ? tags.split(',').map(t => t.trim())
          : [];

      /**
       * Normalize content (text + images)
       */
      let parsedContent;
      try {
        const parsed = JSON.parse(content);
        parsedContent = Array.isArray(parsed)
          ? parsed
          : [{ type: 'text', value: content }];
      } catch {
        parsedContent = [{ type: 'text', value: content }];
      }

      /**
       * Upload content images to IPFS
       */
      const contentImageUrls = [];

      if (req.files?.contentImages?.length) {
        for (const file of req.files.contentImages) {
          const uploaded = await uploadToStorage(file);
          contentImageUrls.push(uploaded.ipfsUri);
        }
      }

      /**
       * Final content array
       */
      const finalContent = [
        ...parsedContent,
        ...contentImageUrls.map(url => ({
          type: 'image',
          value: url,
        })),
      ];

      blog = await Blog.create({
        title,
        subTitle,
        content: finalContent,
        coverImage: coverImageData?.ipfsUri || null,
        tags: parsedTags,
        status: BLOG_STATUS.PUBLISHED,
        publishedAt: new Date(),
      });
    }

    /**
     * =========================
     * RESPONSE NORMALIZATION
     * =========================
     */
    const blogObj = blog.toObject();

    blogObj.content = sanitizeContentForResponse(blogObj.content);
    blogObj.contentString = buildContentString(blogObj.content);

    return res.status(200).json({
      success: true,
      message: 'Blog published successfully',
      data: blogObj,
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
    const { title, subTitle, content, tags } = req.body || {};

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
    if (req.files?.coverImage?.[0]) {
      const coverImageData = await uploadToStorage(
        req.files.coverImage[0]
      );
      blog.coverImage = coverImageData?.ipfsUri || null;
    }

    /**
     * =========================
     * Update tags
     * =========================
     */
    if (tags !== undefined) {
      blog.tags =
        typeof tags === 'string'
          ? tags.split(',').map(t => t.trim())
          : [];
    }

    /**
     * =========================
     * Update content
     * =========================
     */
    if (content !== undefined) {
      // Parse content safely
      let parsedContent;
      try {
        const parsed = JSON.parse(content);
        parsedContent = Array.isArray(parsed)
          ? parsed
          : [{ type: 'text', value: content }];
      } catch {
        parsedContent = [{ type: 'text', value: content }];
      }

      // Upload new content images (if any)
      const contentImageUrls = [];

      if (req.files?.contentImages?.length) {
        for (const file of req.files.contentImages) {
          const uploaded = await uploadToStorage(file);
          contentImageUrls.push(uploaded.ipfsUri);
        }
      }

      // Merge text + images
      blog.content = [
        ...parsedContent,
        ...contentImageUrls.map(url => ({
          type: 'image',
          value: url,
        })),
      ];
    }

    await blog.save();

    /**
     * =========================
     * Normalize response
     * =========================
     */
    const blogObj = blog.toObject();

    blogObj.content = sanitizeContentForResponse(blogObj.content);
    blogObj.contentString = buildContentString(blogObj.content);

    return res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: blogObj,
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
      .select('title subTitle tags content coverImage status createdAt publishedAt');

    const responseBlogs = blogs.map(blog => {
      const blogObj = blog.toObject();

      // sanitize content blocks
      const cleanContent = sanitizeContentForResponse(blogObj.content);

      return {
        ...blogObj,
        content: cleanContent,
        contentString: buildContentString(cleanContent),
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


const getBlogById = async (req, res) => {
  try {
    const { blogId } = req.params;

    const blog = await Blog.findById(blogId)
      .select(
        'title subTitle content coverImage tags status createdAt updatedAt publishedAt'
      );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    const blogObj = blog.toObject();

    // Remove _id from content blocks
    blogObj.content = sanitizeContentForResponse(blogObj.content);

    // Generate contentString (same logic you already use)
    blogObj.contentString = buildContentString(blogObj.content);

    return res.status(200).json({
      success: true,
      data: blogObj,
    });
  } catch (error) {
    console.error('Get blog by ID error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blog',
    });
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
