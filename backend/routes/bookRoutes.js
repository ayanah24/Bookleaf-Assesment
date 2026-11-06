const express = require('express');
const router = express.Router();
const { getMyBooks, getAllBooks } = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/auth');

// Authors get their own books
router.get('/my-books', protect, authorize('author'), getMyBooks);

// Admins can query catalog
router.get('/', protect, authorize('admin'), getAllBooks);

module.exports = router;
