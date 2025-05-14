require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const store = require('./utils/inMemoryStore');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join_room', async (roomData) => {
    const room = await store.getRoom(roomData.roomId);
    if (room) {
      socket.join(roomData.roomId);
      await store.addParticipant(roomData.roomId, {
        socketId: socket.id,
        name: roomData.userName,
      });
      socket.to(roomData.roomId).emit('user_joined', {
        userName: roomData.userName,
        userId: roomData.userId
      });
    }
  });

  socket.on('send_message', (messageData) => {
    socket.to(messageData.roomId).emit('message', {
      senderId: socket.id,
      senderName: messageData.userName,
      message: messageData.message
    });
  });

  socket.on('send_file', (fileData) => {
    socket.to(fileData.roomId).emit('file', {
      senderId: socket.id,
      senderName: fileData.userName,
      file: fileData.file,
      fileName: fileData.fileName,
      fileType: fileData.fileType
    });
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected');
    // Remove participant from all rooms they were in
    for (const [roomId, room] of store.rooms.entries()) {
      const participant = room.participants.find(p => p.socketId === socket.id);
      if (participant) {
        await store.removeParticipant(roomId, socket.id);
        socket.to(roomId).emit('user_left', {
          userName: participant.name,
          userId: socket.id
        });
      }
    }
  });
});

// Serve the client application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// API routes
const chatRoomRoutes = require('./routes/chatRoomRoutes');
app.use('/api/rooms', chatRoomRoutes);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 