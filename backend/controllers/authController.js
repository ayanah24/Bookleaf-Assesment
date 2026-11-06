const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const inMemoryStore = require('../services/inMemoryStore');
const { JWT_SECRET } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '7d',
  });
};

/**
 * @desc    Authenticate user & return JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = null;
    let isMatch = false;

    // Use MongoDB if connected, else fallback to inMemoryStore
    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ email: cleanEmail }).select('+password');
      if (user) {
        isMatch = await user.matchPassword(password);
      }
    } else {
      user = inMemoryStore.findUserByEmail(cleanEmail);
      if (user) {
        isMatch = await bcrypt.compare(password, user.password);
      }
    }

    if (!user || !isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        authorId: user.authorId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        city: user.city,
        joinedDate: user.joinedDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.user.id || req.user._id);
    } else {
      user = inMemoryStore.findUserById(req.user.id || req.user._id);
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  generateToken,
};
