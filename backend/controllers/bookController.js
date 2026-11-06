const mongoose = require('mongoose');
const Book = require('../models/Book');
const inMemoryStore = require('../services/inMemoryStore');

/**
 * @desc    Get all books for the authenticated author
 * @route   GET /api/books/my-books
 * @access  Private (Author)
 */
const getMyBooks = async (req, res, next) => {
  try {
    let books = [];
    const authorId = req.user._id || req.user.id;

    if (mongoose.connection.readyState === 1) {
      books = await Book.find({ author: authorId }).sort({ createdAt: -1 });
    } else {
      books = inMemoryStore.findBooksByAuthor(authorId);
    }

    const summary = books.reduce(
      (acc, book) => {
        acc.totalBooks += 1;
        acc.totalCopiesSold += book.totalCopiesSold || 0;
        acc.totalRoyaltyEarned += book.totalRoyaltyEarned || 0;
        acc.totalRoyaltyPaid += book.royaltyPaid || 0;
        acc.totalRoyaltyPending += book.royaltyPending || 0;
        return acc;
      },
      {
        totalBooks: 0,
        totalCopiesSold: 0,
        totalRoyaltyEarned: 0,
        totalRoyaltyPaid: 0,
        totalRoyaltyPending: 0,
      }
    );

    res.status(200).json({
      success: true,
      count: books.length,
      summary,
      books,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all books across the entire catalog (for Admins)
 * @route   GET /api/books
 * @access  Private (Admin)
 */
const getAllBooks = async (req, res, next) => {
  try {
    let books = [];
    if (mongoose.connection.readyState === 1) {
      books = await Book.find().populate('author', 'name email authorId').sort({ createdAt: -1 });
    } else {
      books = inMemoryStore.findAllBooks();
    }

    res.status(200).json({
      success: true,
      count: books.length,
      books,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyBooks,
  getAllBooks,
};
