const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Blog Status Enum
 * DRAFT     → Created but not visible publicly
 * PUBLISHED → Visible on website
 */
const BLOG_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
};

const BlogSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    subTitle: {
      type: String,
      trim: true,
    },

    content: {
  type: String,     // HTML / text / IPFS URLs / anything
  default: '',      // allow empty content
},

    coverImage: {
      type: String, // URL or stored path
      default: null,
    },

    tags: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: Object.values(BLOG_STATUS),
      default: BLOG_STATUS.DRAFT,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

/**
 * Indexes
 * Improves read performance for blog listing
 */
BlogSchema.index({ status: 1, createdAt: -1 });

const Blog = mongoose.model('Blog', BlogSchema);

module.exports = {
  Blog,
  BLOG_STATUS,
};
