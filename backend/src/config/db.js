/**
 * Database connection setup using Mongoose
 */

const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trao_interview_prep';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at ${uri}: ${err.message}`);
    console.warn(`[MongoDB Info] App will run with in-memory persistence fallback for un-persisted demo sessions.`);
  }
}

module.exports = connectDB;
