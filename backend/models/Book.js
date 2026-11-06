const mongoose = require('mongoose');

/**
 * Book Model
 * Mirrors the BookLeaf catalog schema.
 * Handles edge cases explicitly:
 * - Books in production (mrp=null, publicationDate=null, sales=0)
 * - Books with pending royalties vs zero royalties
 */
const bookSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorId: {
      type: String, // String reference matching AUTH001 for convenience
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
      default: '',
      trim: true,
    },
    genre: {
      type: String,
      default: 'General',
    },
    publicationDate: {
      type: String,
      default: null, // Null if in production
    },
    status: {
      type: String,
      required: true,
      default: 'In Production',
    },
    mrp: {
      type: Number,
      default: null,
    },
    authorRoyaltyPerCopy: {
      type: Number,
      default: null,
    },
    totalCopiesSold: {
      type: Number,
      default: 0,
    },
    totalRoyaltyEarned: {
      type: Number,
      default: 0,
    },
    royaltyPaid: {
      type: Number,
      default: 0,
    },
    royaltyPending: {
      type: Number,
      default: 0,
    },
    lastRoyaltyPayoutDate: {
      type: String,
      default: null,
    },
    printPartner: {
      type: String,
      default: null,
    },
    availableOn: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Book', bookSchema);
