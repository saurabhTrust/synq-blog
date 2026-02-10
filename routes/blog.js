const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const upload = require('../middlewares/upload');

// Multer execution (fields)
const blogUpload = upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'contentImages', maxCount: 10 },
]);

/**
 * Extract coverImage for controller
 */
const extractCoverImage = (req, res, next) => {
  req.file =
    req.files && req.files.coverImage
      ? req.files.coverImage[0]
      : null;

  next();
};

/**
 * Create blog (Draft)
 */
router.post(
  '/blog',
  blogUpload,
  extractCoverImage,
  blogController.createDraftBlog
);

/**
 * Publish blog directly
 */
router.post(
  '/blog/publish',
  blogUpload,
  extractCoverImage,
  blogController.publishBlog
);

/**
 * Publish existing draft
 */
router.post(
  '/blog/:blogId/publish',
  blogUpload,
  extractCoverImage,
  blogController.publishBlog
);

/**
 * Update blog
 */
router.put(
  '/blog/:blogId',
  blogUpload,
  extractCoverImage,
  blogController.updateBlog
);

router.get('/blog', blogController.getAllBlogs);
router.get('/blog/:blogId', blogController.getBlogById);
router.get('/blogs/json/:blogId', blogController.getBlogByIdJson);
router.delete('/blog/:blogId', blogController.deleteBlog);

module.exports = router;
