const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const inMemoryStore = require('../services/inMemoryStore');

const JWT_SECRET = process.env.JWT_SECRET || 'bookleaf_secure_jwt_secret_dev_2026';

/**
 * Protect Middleware
 * Ensures the user is authenticated via Bearer JWT.
 * Attaches decoded user object to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: No authentication token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findById(decoded.id).select('-password');
    } else {
      user = inMemoryStore.findUserById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: Invalid or expired token.',
    });
  }
};

/**
 * Role-Based Access Control (RBAC)
 * Restricts access to specific roles ('author' or 'admin').
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'unauthenticated'}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
  JWT_SECRET,
};
