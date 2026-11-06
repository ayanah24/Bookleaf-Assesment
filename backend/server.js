const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// CORS configuration (allow local Vite dev server and deployed frontend)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching origin
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in assessment mode to prevent deployment CORS blockers
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Initialize Socket.io for Real-Time synchronization
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  // Join global admin room for real-time ticket alerts
  socket.on('join_admin_room', () => {
    socket.join('admin_room');
  });

  // Join individual ticket room for live conversation streaming
  socket.on('join_ticket_room', (ticketId) => {
    socket.join(`ticket_${ticketId}`);
  });

  socket.on('leave_ticket_room', (ticketId) => {
    socket.leave(`ticket_${ticketId}`);
  });

  socket.on('disconnect', () => {
    // Graceful disconnect
  });
});

// Make io accessible within Express controllers via req.app.get('io')
app.set('io', io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'BookLeaf Author Support Portal API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/tickets', ticketRoutes);

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 BookLeaf Support API running on port ${PORT}`);
    console.log(`📡 Socket.io Real-Time Server initialized`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log(`=================================================\n`);
  });
}

module.exports = { app, server };
