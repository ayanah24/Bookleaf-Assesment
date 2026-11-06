const mongoose = require('mongoose');

/**
 * Connect to MongoDB with graceful error reporting.
 * In production or local dev with mongod running, this connects cleanly.
 * If MongoDB is not active locally, it logs clear instructions for MongoDB Atlas / local connection.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookleaf_portal';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`\n[Database Warning] Could not connect to local MongoDB at: ${uri}`);
    console.warn(`[Database Tip] If you haven't started local mongod, you can add MONGODB_URI in backend/.env pointing to MongoDB Atlas free cluster.\n`);
    // Return null so callers can handle fallback gracefully if desired
    return null;
  }
};

module.exports = connectDB;
