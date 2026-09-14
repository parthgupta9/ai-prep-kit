/**
 * Authentication Routes (/api/auth)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, JWT_SECRET } = require('../middleware/authMiddleware');
const { isMongoConnected } = require('../config/db');

const router = express.Router();

// Mock in-memory user database if MongoDB is offline
const inMemoryUsers = new Map();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || password.length < 4) {
      return res.status(400).json({ error: 'Please provide valid email and password (min 4 chars).' });
    }

    const lowerEmail = email.toLowerCase().trim();

    let existingUser = null;
    if (isMongoConnected()) {
      try {
        existingUser = await User.findOne({ email: lowerEmail });
      } catch (e) {
        existingUser = inMemoryUsers.get(lowerEmail);
      }
    } else {
      existingUser = inMemoryUsers.get(lowerEmail);
    }

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let newUser = null;
    if (isMongoConnected()) {
      try {
        newUser = await User.create({
          email: lowerEmail,
          password: hashedPassword,
          name: name || lowerEmail.split('@')[0]
        });
      } catch (e) {
        newUser = {
          _id: 'mem_usr_' + Date.now(),
          email: lowerEmail,
          password: hashedPassword,
          name: name || lowerEmail.split('@')[0]
        };
        inMemoryUsers.set(lowerEmail, newUser);
      }
    } else {
      newUser = {
        _id: 'mem_usr_' + Date.now(),
        email: lowerEmail,
        password: hashedPassword,
        name: name || lowerEmail.split('@')[0]
      };
      inMemoryUsers.set(lowerEmail, newUser);
    }

    const token = jwt.sign({ userId: newUser._id.toString(), email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: newUser._id, email: newUser.email, name: newUser.name }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const lowerEmail = email.toLowerCase().trim();

    let user = null;
    if (isMongoConnected()) {
      try {
        user = await User.findOne({ email: lowerEmail });
      } catch (e) {
        user = inMemoryUsers.get(lowerEmail);
      }
    } else {
      user = inMemoryUsers.get(lowerEmail);
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Current User Profile
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    user: { id: req.user.userId, email: req.user.email }
  });
});

module.exports = router;
