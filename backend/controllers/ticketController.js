const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Book = require('../models/Book');
const inMemoryStore = require('../services/inMemoryStore');
const { analyzeTicket } = require('../services/aiService');

const getIO = (req) => {
  return req.app.get('io');
};

/**
 * @desc    Create a new support ticket (Author)
 * @route   POST /api/tickets
 * @access  Private (Author)
 */
const createTicket = async (req, res, next) => {
  try {
    const { bookId, subject, description, attachmentName } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required.',
      });
    }

    let book = null;
    let bookTitle = 'General / Account Level';

    if (bookId) {
      if (mongoose.connection.readyState === 1) {
        book = await Book.findById(bookId);
      } else {
        book = inMemoryStore.findBookById(bookId);
      }
      if (book) {
        bookTitle = `${book.title} (ISBN: ${book.isbn || 'Pending'})`;
      }
    }

    // Step 1: AI Auto-Classification & Grounded Draft Generation
    const aiResult = await analyzeTicket(subject, description, book);

    let ticket = null;
    const authorId = req.user._id || req.user.id;

    if (mongoose.connection.readyState === 1) {
      const count = await Ticket.countDocuments();
      const ticketNumber = `TICK-${1000 + count + 1}`;

      ticket = await Ticket.create({
        ticketNumber,
        author: authorId,
        authorName: req.user.name,
        authorEmail: req.user.email,
        book: book ? book._id : null,
        bookTitle,
        subject,
        description,
        category: aiResult.category,
        priority: aiResult.priority,
        status: 'Open',
        aiClassification: {
          suggestedCategory: aiResult.category,
          suggestedPriority: aiResult.priority,
          confidence: aiResult.confidence,
          isOverridden: false,
        },
        aiDraftResponse: aiResult.draftResponse,
        messages: [
          {
            sender: authorId,
            senderName: req.user.name,
            senderRole: 'author',
            message: description,
            attachmentName: attachmentName || null,
            createdAt: new Date(),
          },
        ],
      });
    } else {
      ticket = inMemoryStore.createTicket({
        author: authorId,
        authorName: req.user.name,
        authorEmail: req.user.email,
        book: book ? book._id : null,
        bookTitle,
        subject,
        description,
        category: aiResult.category,
        priority: aiResult.priority,
        aiClassification: {
          suggestedCategory: aiResult.category,
          suggestedPriority: aiResult.priority,
          confidence: aiResult.confidence,
          isOverridden: false,
        },
        aiDraftResponse: aiResult.draftResponse,
        messages: [
          {
            sender: authorId,
            senderName: req.user.name,
            senderRole: 'author',
            message: description,
            attachmentName: attachmentName || null,
            createdAt: new Date(),
          },
        ],
      });
    }

    // Real-time broadcast to Admin Queue
    const io = getIO(req);
    if (io) {
      io.to('admin_room').emit('ticket_created', ticket);
    }

    res.status(201).json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tickets (Author sees only own; Admin sees all with filter & urgency sort)
 * @route   GET /api/tickets
 * @access  Private
 */
const getTickets = async (req, res, next) => {
  try {
    const { status, category, priority, search, sortBy } = req.query;
    const authorId = req.user.role === 'author' ? (req.user._id || req.user.id) : null;
    let tickets = [];

    if (mongoose.connection.readyState === 1) {
      let query = {};
      if (authorId) query.author = authorId;
      if (status && status !== 'All') query.status = status;
      if (category && category !== 'All') query.category = category;
      if (priority && priority !== 'All') query.priority = priority;
      if (search) {
        query.$or = [
          { subject: { $regex: search, $options: 'i' } },
          { ticketNumber: { $regex: search, $options: 'i' } },
          { authorName: { $regex: search, $options: 'i' } },
        ];
      }

      tickets = await Ticket.find(query).sort({ createdAt: -1 });

      if (req.user.role === 'admin' && (!sortBy || sortBy === 'urgency')) {
        const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        const statusWeight = { Open: 3, 'In Progress': 2, Resolved: 1, Closed: 0 };

        tickets = tickets.sort((a, b) => {
          const sDiff = (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
          if (sDiff !== 0) return sDiff;
          const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
          if (pDiff !== 0) return pDiff;
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
      }
    } else {
      tickets = inMemoryStore.findTickets({
        authorId,
        status,
        category,
        priority,
        search,
        sortBy,
      });
    }

    // Sanitize for author view (strip internal notes and raw draft response)
    if (req.user.role === 'author') {
      tickets = tickets.map((t) => {
        const plain = typeof t.toObject === 'function' ? t.toObject() : { ...t };
        delete plain.internalNotes;
        delete plain.aiDraftResponse;
        return plain;
      });
    }

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single ticket by ID
 * @route   GET /api/tickets/:id
 * @access  Private
 */
const getTicketById = async (req, res, next) => {
  try {
    let ticket = null;
    const authorId = (req.user._id || req.user.id).toString();

    if (mongoose.connection.readyState === 1) {
      ticket = await Ticket.findById(req.params.id).populate('book');
    } else {
      ticket = inMemoryStore.findTicketById(req.params.id);
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
      });
    }

    // Role check: Author can only access own ticket
    const ticketAuthorId = (ticket.author._id || ticket.author).toString();
    if (req.user.role === 'author' && ticketAuthorId !== authorId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this ticket.',
      });
    }

    const plain = typeof ticket.toObject === 'function' ? ticket.toObject() : { ...ticket };

    if (req.user.role === 'author') {
      delete plain.internalNotes;
      delete plain.aiDraftResponse;
    }

    res.status(200).json({
      success: true,
      ticket: plain,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a message to the conversation (Author or Admin)
 * @route   POST /api/tickets/:id/messages
 * @access  Private
 */
const addMessage = async (req, res, next) => {
  try {
    const { message, attachmentName } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty.',
      });
    }

    const newMessage = {
      sender: req.user._id || req.user.id,
      senderName: req.user.name,
      senderRole: req.user.role,
      message,
      attachmentName: attachmentName || null,
      createdAt: new Date(),
    };

    let updatedTicket = null;

    if (mongoose.connection.readyState === 1) {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found.' });
      }
      ticket.messages.push(newMessage);
      if (req.user.role === 'admin' && ticket.status === 'Open') {
        ticket.status = 'In Progress';
      } else if (req.user.role === 'author' && (ticket.status === 'Resolved' || ticket.status === 'Closed')) {
        ticket.status = 'In Progress';
      }
      await ticket.save();
      updatedTicket = ticket;
    } else {
      updatedTicket = inMemoryStore.addMessage(req.params.id, newMessage);
      if (!updatedTicket) {
        return res.status(404).json({ success: false, message: 'Ticket not found.' });
      }
    }

    // Real-Time Socket.io emission
    const io = getIO(req);
    if (io) {
      io.to(`ticket_${updatedTicket._id}`).emit('new_message', {
        ticketId: updatedTicket._id,
        message: newMessage,
        status: updatedTicket.status,
      });
      io.to('admin_room').emit('ticket_updated', updatedTicket);
    }

    res.status(200).json({
      success: true,
      message: newMessage,
      ticketStatus: updatedTicket.status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add an internal note (Admin only - invisible to author)
 * @route   POST /api/tickets/:id/notes
 * @access  Private (Admin)
 */
const addInternalNote = async (req, res, next) => {
  try {
    const { note } = req.body;

    if (!note || note.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Note content cannot be empty.',
      });
    }

    const newNote = {
      admin: req.user._id || req.user.id,
      adminName: req.user.name,
      note,
      createdAt: new Date(),
    };

    let updatedTicket = null;

    if (mongoose.connection.readyState === 1) {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found.' });
      }
      ticket.internalNotes.push(newNote);
      await ticket.save();
      updatedTicket = ticket;
    } else {
      updatedTicket = inMemoryStore.addInternalNote(req.params.id, newNote);
      if (!updatedTicket) {
        return res.status(404).json({ success: false, message: 'Ticket not found.' });
      }
    }

    // Broadcast only to admin room
    const io = getIO(req);
    if (io) {
      io.to('admin_room').emit('internal_note_added', {
        ticketId: updatedTicket._id,
        note: newNote,
      });
    }

    res.status(200).json({
      success: true,
      note: newNote,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update ticket category, priority, status, or assignee (Admin only)
 * @route   PATCH /api/tickets/:id
 * @access  Private (Admin)
 */
const updateTicket = async (req, res, next) => {
  try {
    let updatedTicket = null;

    if (mongoose.connection.readyState === 1) {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found.' });
      }

      const { category, priority, status, assignedToName, aiDraftResponse } = req.body;

      if (category && category !== ticket.category) {
        ticket.category = category;
        ticket.aiClassification.isOverridden = true;
      }
      if (priority && priority !== ticket.priority) {
        ticket.priority = priority;
        ticket.aiClassification.isOverridden = true;
      }
      if (status) ticket.status = status;
      if (assignedToName) ticket.assignedToName = assignedToName;
      if (aiDraftResponse !== undefined) ticket.aiDraftResponse = aiDraftResponse;

      await ticket.save();
      updatedTicket = ticket;
    } else {
      updatedTicket = inMemoryStore.updateTicket(req.params.id, req.body);
      if (!updatedTicket) {
        return res.status(404).json({ success: false, message: 'Ticket not found.' });
      }
    }

    // Emit live update
    const io = getIO(req);
    if (io) {
      io.to(`ticket_${updatedTicket._id}`).emit('ticket_meta_updated', updatedTicket);
      io.to('admin_room').emit('ticket_updated', updatedTicket);
    }

    res.status(200).json({
      success: true,
      ticket: updatedTicket,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  addMessage,
  addInternalNote,
  updateTicket,
};
