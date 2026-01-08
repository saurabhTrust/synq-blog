const express = require('express');
const router = express.Router();
const publicBlogController = require('../controllers/publicBlogController');

/**
 * Public SSR APIs (NO AUTH)
 */

// List all published blogs
router.get(
  '/public/blogs',
  publicBlogController.getPublishedBlogs
);

// Get single published blog by slug
router.get(
  '/public/blog/:slug',
  publicBlogController.getPublishedBlogBySlug
);

module.exports = router;
