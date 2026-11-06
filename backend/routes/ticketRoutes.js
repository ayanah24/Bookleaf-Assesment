const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  addMessage,
  addInternalNote,
  updateTicket,
} = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes for all authenticated users
router.route('/')
  .get(protect, getTickets)
  .post(protect, authorize('author'), createTicket);

router.route('/:id')
  .get(protect, getTicketById)
  .patch(protect, authorize('admin'), updateTicket);

router.post('/:id/messages', protect, addMessage);
router.post('/:id/notes', protect, authorize('admin'), addInternalNote);

module.exports = router;
