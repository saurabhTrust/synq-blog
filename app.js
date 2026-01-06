require('dotenv').config();
const express = require('express');
const connectMongo = require('./services/mongodb');
const blogRoutes = require('./routes/blog.js');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectMongo();

app.use('/api', blogRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
