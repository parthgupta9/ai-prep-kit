/**
 * Database connection setup using Mongoose with instant fallback helper
 */

const mongoose = require('mongoose');

// Disable Mongoose command buffering so queries fail-fast if DB is offline
mongoose.set('bufferCommands', false);

let mongoConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trao_interview_prep';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000
    });
    mongoConnected = true;
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (err) {
    mongoConnected = false;
    console.warn(`[MongoDB Info] Connection failed: ${err.name}: ${err.message}`);
    console.warn('[MongoDB Info] Running with in-memory persistence fallback.');
  }
}

function isMongoConnected() {
  return mongoConnected && mongoose.connection && mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  isMongoConnected
};
