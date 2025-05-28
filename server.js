// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Store active rooms and their metadata
const rooms = new Map();

// Generate a new room with expiration
function createRoom(expirationMinutes = 60, password, roomName = '') {
    console.log('Creating room with expiration:', expirationMinutes, 'minutes');
    const roomId = uuidv4();
    const expirationTime = Date.now() + (expirationMinutes * 60 * 1000);
    
    rooms.set(roomId, {
        password,
        expirationTime,
        roomName,
        users: new Map(),
        messages: []
    });

    console.log('Room created:', roomId);

    // Schedule room deletion
    setTimeout(() => {
        if (rooms.has(roomId)) {
            console.log('Room expired:', roomId);
            rooms.delete(roomId);
            io.to(roomId).emit('roomExpired');
        }
    }, expirationMinutes * 60 * 1000);

    return { roomId, expirationTime, roomName };
}

// Verify room password
function verifyRoomPassword(roomId, password) {
    const room = rooms.get(roomId);
    return room && room.password === password;
}

io.on('connection', socket => {
    console.log('A user connected:', socket.id);

    // Create a new room
    socket.on('createRoom', ({ expirationMinutes, password, roomName }, callback) => {
        console.log('Create room request:', { expirationMinutes, password, roomName });
        try {
            const { roomId, expirationTime, roomName: createdRoomName } = createRoom(expirationMinutes, password, roomName);
            console.log('Room created successfully:', roomId);
            callback({ roomId, expirationTime, roomName: createdRoomName });
        } catch (error) {
            console.error('Error creating room:', error);
            callback({ error: 'Failed to create room' });
        }
    });

    // Join a room
    socket.on('joinRoom', ({ roomId, password, nickname }, callback) => {
        console.log('Join room request:', { roomId, nickname });
        const room = rooms.get(roomId);
        if (!room) {
            console.log('Room not found:', roomId);
            callback({ success: false, message: 'Room not found' });
            return;
        }
        if (room.password !== password) {
            console.log('Invalid password for room:', roomId);
            callback({ success: false, message: 'Invalid password' });
            return;
        }
        // Prevent duplicate nicknames
        for (const user of room.users.values()) {
            if (user.nickname === nickname) {
                callback({ success: false, message: 'This nickname is already in use in this room.' });
                return;
            }
        }
        // Join socket.io room
        socket.join(roomId);
        // Store user info
        room.users.set(socket.id, { nickname });
        // Notify others
        socket.to(roomId).emit('userJoined', { nickname });
        // Emit updated user count to all in room
        io.to(roomId).emit('userCount', { count: room.users.size });
        console.log('User joined room:', { roomId, nickname, usersCount: room.users.size });
        // Send room history and metadata
        callback({ 
            success: true, 
            messages: room.messages,
            users: Array.from(room.users.values()),
            roomName: room.roomName,
            expirationTime: room.expirationTime
        });
    });

    // Handle encrypted messages
    socket.on('message', ({ roomId, encryptedMessage }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const user = room.users.get(socket.id);
        if (!user) return;

        const message = {
            id: uuidv4(),
            sender: user.nickname,
            content: encryptedMessage,
            timestamp: Date.now()
        };

        room.messages.push(message);
        io.to(roomId).emit('message', message);
    });

    // Handle leaveRoom event
    socket.on('leaveRoom', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.users.has(socket.id)) {
            const user = room.users.get(socket.id);
            room.users.delete(socket.id);
            socket.to(roomId).emit('userLeft', { nickname: user.nickname });
            // Emit updated user count to all in room
            io.to(roomId).emit('userCount', { count: room.users.size });
            console.log('User left room:', { roomId, nickname: user.nickname });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        rooms.forEach((room, roomId) => {
            if (room.users.has(socket.id)) {
                const user = room.users.get(socket.id);
                room.users.delete(socket.id);
                socket.to(roomId).emit('userLeft', { nickname: user.nickname });
                // Emit updated user count to all in room
                io.to(roomId).emit('userCount', { count: room.users.size });
                console.log('User left room:', { roomId, nickname: user.nickname });
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
