const { Blog, BLOG_STATUS } = require('../models/schemas');
const { uploadToStorage } = require('../services/ipfs');


// Create Blog (Draft)
// Used when admin clicks "Save as Draft"

const createDraftBlog = async (req, res) => {
  try {
    const { title, subTitle, description, tags } = req.body || {};

    const coverImageData = req.file
      ? await uploadToStorage(req.file) // uploads to IPFS
      : null;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required',
      });
    }

    const parsedTags =
      typeof tags === 'string'
        ? tags.split(',').map(tag => tag.trim())
        : [];

    const blog = await Blog.create({
      title,
      subTitle,
      description,
      coverImage: coverImageData?.ipfsUri || null, // ipfs://CID
      tags: parsedTags,
      status: BLOG_STATUS.DRAFT,
    });

    return res.status(201).json({
      success: true,
      message: 'Blog saved as draft',
      data: blog,
    });
  } catch (error) {
    console.error('Create draft error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create draft blog',
    });
  }
};


const publishBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { title, subTitle, description, tags } = req.body || {};

    let blog;

    // ===============================
    // CASE 1: Publish existing draft
    // ===============================
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

      // ✅ Do NOT upload image again
      // coverImage already contains ipfs://CID from draft

      blog.status = BLOG_STATUS.PUBLISHED;
      blog.publishedAt = new Date();
      await blog.save();
    }

    // =================================
    // CASE 2: Direct publish (no draft)
    // =================================
    else {
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Title and description are required to publish',
        });
      }

      // 🔴 Upload to IPFS HERE (only once)
      const coverImageData = req.file
        ? await uploadToStorage(req.file)
        : null;

      const parsedTags =
        typeof tags === 'string'
          ? tags.split(',').map(t => t.trim())
          : [];

      blog = await Blog.create({
        title,
        subTitle,
        description,
        coverImage: coverImageData?.ipfsUri || null, // ipfs://CID
        tags: parsedTags,
        status: BLOG_STATUS.PUBLISHED,
        publishedAt: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Blog published successfully',
      data: blog, // coverImage always ipfs://CID
    });
  } catch (error) {
    console.error('Publish blog error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to publish blog',
    });
  }
};

const updateBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { title, subTitle, description, tags } = req.body || {};

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // =========================
    // Update text fields
    // =========================
    if (title !== undefined) blog.title = title;
    if (subTitle !== undefined) blog.subTitle = subTitle;
    if (description !== undefined) blog.description = description;

    if (tags !== undefined) {
      blog.tags =
        typeof tags === 'string'
          ? tags.split(',').map(t => t.trim())
          : [];
    }

    // =========================
    // Update cover image (if provided)
    // =========================
    if (req.file) {
      const coverImageData = await uploadToStorage(req.file);
      blog.coverImage = coverImageData?.ipfsUri || null;

      // OPTIONAL (recommended later):
      // if (blog.coverImage) await unpinFromIPFS(oldCid);
    }


    await blog.save();

    return res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: blog,
    });
  } catch (error) {
    console.error('Update blog error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update blog',
    });
  }
};

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
        'title subTitle coverImage status createdAt publishedAt'
      );

    return res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    console.error('Get blogs error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
    });
  }
};

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

    // CASE 1: Published → move back to draft (soft delete)
    if (blog.status === BLOG_STATUS.PUBLISHED) {
      blog.status = BLOG_STATUS.DRAFT;
      blog.publishedAt = null;

      await blog.save();

      return res.status(200).json({
        success: true,
        message: 'Blog unpublished and moved to draft',
      });
    }

    // CASE 2: Draft → hard delete
    if (blog.status === BLOG_STATUS.DRAFT) {
      await Blog.deleteOne({ _id: blogId });

      return res.status(200).json({
        success: true,
        message: 'Draft blog permanently deleted',
      });
    }

    // Fallback (future-proof)
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
    deleteBlog,
};
