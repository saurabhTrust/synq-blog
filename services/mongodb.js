const mongoose = require('mongoose');

const connectMongo = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectMongo;
