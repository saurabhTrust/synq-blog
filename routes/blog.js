const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const upload = require('../middlewares/upload');
// const { verifyToken } = require('../middleware/auth'); // mentor will handle auth

/**
 * Handle image uploads (mentor-style)
 */
const handleImageUploads = (req, res, next) => {
  const uploadHandler = upload.fields([
    { name: 'coverImage', maxCount: 1 }, // Blog cover image
  ]);

  uploadHandler(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Normalize files
    if (req.files && req.files.coverImage && req.files.coverImage.length > 0) {
      req.file = req.files.coverImage[0];   // single file access
      req.files = req.files.coverImage;     // array access (future-proof)
    } else {
      req.file = null;
      req.files = [];
    }

    next();
  });
};

/**
 * Create blog (Draft)
 */
router.post(
  '/blog',
  // verifyToken, // mentor will plug this
  handleImageUploads,
  blogController.createDraftBlog
);

/**
 * Publish blog directly (no draft exists)
 * Create + publish in one go
 */
router.post(
  '/blog/publish',
  // verifyToken,
  handleImageUploads,
  blogController.publishBlog
);

/**
 * Publish existing draft blog
 * Only updates status → PUBLISHED
 */
router.post(
  '/blog/:blogId/publish',
  // verifyToken,
  handleImageUploads, // optional, allows updating cover image on publish
  blogController.publishBlog
);

router.put(
  '/blog/:blogId',
  handleImageUploads,
  blogController.updateBlog
);

router.get(
  '/blog',
  // verifyToken (mentor will add)
  blogController.getAllBlogs
);

router.delete(
  '/blog/:blogId',
  // verifyToken
  blogController.deleteBlog
);


module.exports = router;
