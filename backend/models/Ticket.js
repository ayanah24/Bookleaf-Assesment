const mongoose = require('mongoose');

const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

/**
 * Ticket Model
 * Encapsulates the entire lifecycle of an author query.
 * Contains AI classification tags, internal admin notes, and conversation messages.
 */
const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorEmail: {
      type: String,
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null, // Nullable for "General / Account Level"
    },
    bookTitle: {
      type: String,
      default: 'General / Account Level',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      default: 'General Inquiry',
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'Medium',
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'Open',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedToName: {
      type: String,
      default: 'Unassigned',
    },
    // AI Classification & Draft Tracking
    aiClassification: {
      suggestedCategory: { type: String, enum: CATEGORIES },
      suggestedPriority: { type: String, enum: PRIORITIES },
      confidence: { type: Number, default: 0.85 },
      isOverridden: { type: Boolean, default: false },
    },
    aiDraftResponse: {
      type: String,
      default: '',
    },
    // Internal Notes: Visible ONLY to BookLeaf Ops team
    internalNotes: [
      {
        admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        adminName: String,
        note: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // Conversation Messages: Visible to both Author and Admins
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        senderName: { type: String, required: true },
        senderRole: { type: String, enum: ['author', 'admin'], required: true },
        message: { type: String, required: true },
        attachmentName: { type: String, default: null },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Ticket', ticketSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.STATUSES = STATUSES;
