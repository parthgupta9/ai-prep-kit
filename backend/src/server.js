/**
 * Main Express Backend Application Server
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const kitRoutes = require('./routes/kitRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Trao AI Interview Prep Kit API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/kits', kitRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Express Error]:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Trao Backend API Server] Listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
