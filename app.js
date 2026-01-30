require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectMongo = require('./services/mongodb');
const blogRoutes = require('./routes/blog.js');
const publicBlogRoutes = require('./routes/publicBlog.js');
const uploadRoutes = require('./routes/upload.js');

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectMongo();

app.use('/api', blogRoutes, publicBlogRoutes);
app.use('/api', uploadRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
