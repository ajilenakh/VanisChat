require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

const app = express();
const server = http.createServer(app);

// Security middleware with proper CSP configuration
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://cdnjs.cloudflare.com",
                "https://esm.sh"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com"
            ],
            fontSrc: [
                "'self'",
                "https:",
                "data:",
                "https://fonts.gstatic.com"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "https:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Initialize Socket.IO with security options
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

app.use(express.static('public'));

// Store active rooms and their metadata in memory
const rooms = new Map();

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Generate a new room
async function createRoom(expirationMinutes = 60, password, roomName = '') {
    const expirationTime = new Date(Date.now() + (expirationMinutes * 60 * 1000));

    let hashedPassword = null;
    if (password) {
        try {
            hashedPassword = await bcrypt.hash(password, 10);
        } catch (e) {
            throw new Error('Failed to hash password');
        }
    }

    const { data, error } = await supabase
        .from('rooms')
        .insert([{
            room_name: roomName,
            password: hashedPassword,
            expires_at: expirationTime.toISOString()
        }])
        .select('id, room_name, expires_at');

    if (error) {
        throw new Error('Failed to create room in database');
    }

    const roomData = data[0];
    const roomId = roomData.id;

    rooms.set(roomId, {
        password,
        expirationTime: new Date(roomData.expires_at).getTime(),
        roomName: roomData.room_name,
        users: new Map()
    });

    const delay = expirationTime.getTime() - Date.now();
    if (delay > 0) {
        setTimeout(() => {
            if (rooms.has(roomId)) {
                rooms.delete(roomId);
                io.to(roomId).emit('roomExpired');
            }
        }, delay);
    } else {
        if (rooms.has(roomId)) {
            rooms.delete(roomId);
            io.to(roomId).emit('roomExpired');
        }
    }

    return { 
        roomId, 
        expirationTime: new Date(roomData.expires_at).getTime(), 
        roomName: roomData.room_name 
    };
}

// Verify room password
async function verifyRoomPassword(roomId, password) {
    const { data, error } = await supabase
        .from('rooms')
        .select('password, expires_at')
        .eq('id', roomId)
        .single();

    if (error && error.details !== 'The result contains 0 rows') {
        return false;
    }

    const room = data;
    const isExpired = room && new Date(room.expires_at) < new Date();

    if (!room || isExpired) {
        if (room && isExpired && rooms.has(roomId)) {
            rooms.delete(roomId);
        }
        return false;
    }

    const hashedPassword = room.password;
    let isPasswordValid = false;
    
    if (password && hashedPassword) {
        try {
            isPasswordValid = await bcrypt.compare(password, hashedPassword);
        } catch (e) {
            return false;
        }
    } else if (!password && !hashedPassword) {
        isPasswordValid = true;
    }

    if (isPasswordValid) {
        if (!rooms.has(roomId) || rooms.get(roomId).password !== hashedPassword || rooms.get(roomId).expirationTime !== new Date(room.expires_at).getTime()) {
            rooms.set(roomId, {
                password: hashedPassword,
                expirationTime: new Date(room.expires_at).getTime(),
                roomName: null,
                users: new Map()
            });

            const delay = new Date(room.expires_at).getTime() - Date.now();
            if (delay > 0) {
                setTimeout(() => {
                    if (rooms.has(roomId)) {
                        rooms.delete(roomId);
                        io.to(roomId).emit('roomExpired');
                    }
                }, delay);
            } else {
                if (rooms.has(roomId)) {
                    rooms.delete(roomId);
                    io.to(roomId).emit('roomExpired');
                }
            }
        }
        return true;
    }
    return false;
}

io.on('connection', socket => {
    socket.on('createRoom', async ({ expirationMinutes, password, roomName }, callback) => {
        try {
            const { roomId, expirationTime, roomName: createdRoomName } = await createRoom(expirationMinutes, password, roomName);
            socket.emit('autoJoinRoom', { roomId, password, nickname: 'Creator' });
            callback({ roomId, expirationTime, roomName: createdRoomName });
        } catch (error) {
            callback({ error: 'Failed to create room' });
        }
    });

    socket.on('joinRoom', async ({ roomId, password, nickname }, callback) => {
        const isPasswordValid = await verifyRoomPassword(roomId, password);

        if (!isPasswordValid) {
            const { data: roomExists, error: checkError } = await supabase
                .from('rooms')
                .select('id, expires_at')
                .eq('id', roomId)
                .single();

            if (checkError && checkError.details !== 'The result contains 0 rows') {
                callback({ success: false, message: 'An error occurred while verifying room.' });
                return;
            }
            
            if (!roomExists) {
                callback({ success: false, message: 'Room not found' });
            } else if (new Date(roomExists.expires_at) < new Date()) {
                callback({ success: false, message: 'Room has expired.' });
            } else {
                callback({ success: false, message: 'Invalid password' });
            }
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            const { data: dbRoom, error: dbFetchError } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', roomId)
                .single();

            if (dbFetchError) {
                callback({ success: false, message: 'An error occurred while joining.' });
                return;
            }

            rooms.set(roomId, {
                password: dbRoom.password,
                expirationTime: new Date(dbRoom.expires_at).getTime(),
                roomName: dbRoom.room_name,
                users: new Map()
            });

            const updatedRoom = rooms.get(roomId);
            const delay = new Date(dbRoom.expires_at).getTime() - Date.now();
            if (delay > 0) {
                setTimeout(() => {
                    if (rooms.has(roomId)) {
                        rooms.delete(roomId);
                        io.to(roomId).emit('roomExpired');
                    }
                }, delay);
            } else {
                if (rooms.has(roomId)) {
                    rooms.delete(roomId);
                    io.to(roomId).emit('roomExpired');
                }
                callback({ success: false, message: 'Room has expired.' });
                return;
            }
        }

        const currentRoom = rooms.get(roomId);
        for (const user of currentRoom.users.values()) {
            if (user.nickname === nickname) {
                callback({ success: false, message: 'This nickname is already in use in this room.' });
                return;
            }
        }

        socket.join(roomId);
        
        try {
            currentRoom.users.set(socket.id, { nickname });
        } catch (e) {
            callback({ success: false, message: 'An internal error occurred during user session setup.' });
            return;
        }

        const { data: messages, error: fetchError } = await supabase
            .from('messages')
            .select('id, room_id, sender_nickname, content, type, timestamp, file_url, file_type')
            .eq('room_id', roomId)
            .order('timestamp', { ascending: true });

        const joinNotification = {
            room_id: roomId,
            sender_nickname: 'system',
            content: `${nickname} joined the room`,
            type: 'notification',
            timestamp: new Date().toISOString()
        };

        await supabase
            .from('messages')
            .insert([joinNotification]);

        socket.to(roomId).emit('userJoined', { nickname });
        const updatedRoom = rooms.get(roomId);
        io.to(roomId).emit('userCount', { count: updatedRoom ? updatedRoom.users.size : 0 });

        const { data: finalRoomDetails, error: finalFetchError } = await supabase
            .from('rooms')
            .select('room_name, expires_at')
            .eq('id', roomId)
            .single();

        if (finalFetchError) {
            callback({ success: false, message: 'Failed to retrieve complete room details.' });
            return;
        }

        const roomAfterUserAdd = rooms.get(roomId);
        if (!roomAfterUserAdd) {
            callback({ success: false, message: 'An internal error occurred after joining.' });
            return;
        }

        callback({ 
            success: true, 
            messages: messages || [],
            users: Array.from(roomAfterUserAdd.users.values()),
            roomName: finalRoomDetails.room_name,
            expirationTime: new Date(finalRoomDetails.expires_at).getTime()
        });
    });

    socket.on('message', async ({ roomId, encryptedMessage, fileUrl = null, fileType = null }) => {
        const room = rooms.get(roomId);
        if (!room) {
            return;
        }

        const user = room.users.get(socket.id);
        if (!user) {
            return;
        }

        const messageType = fileUrl && fileType ? (fileType.startsWith('image') ? 'image' : fileType.startsWith('video') ? 'video' : 'file') : 'text';

        const message = {
            id: uuidv4(),
            room_id: roomId,
            sender_nickname: user.nickname,
            content: encryptedMessage,
            type: messageType,
            timestamp: new Date().toISOString(),
            file_url: fileUrl,
            file_type: fileType
        };

        const { error } = await supabase
            .from('messages')
            .insert([message]);

        if (!error) {
            io.to(roomId).emit('message', message);
        }
    });

    socket.on('leaveRoom', async (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.users.has(socket.id)) {
            const user = room.users.get(socket.id);
            room.users.delete(socket.id);

            const leaveNotification = {
                room_id: roomId,
                sender_nickname: 'system',
                content: `${user.nickname} left the room`,
                type: 'notification',
                timestamp: new Date().toISOString()
            };

            await supabase
                .from('messages')
                .insert([leaveNotification]);

            socket.to(roomId).emit('userLeft', { nickname: user.nickname });
            const updatedRoom = rooms.get(roomId);
            io.to(roomId).emit('userCount', { count: updatedRoom ? updatedRoom.users.size : 0 });

            if (updatedRoom && updatedRoom.users.size === 0) {
                rooms.delete(roomId);
            }
        }
    });

    socket.on('disconnect', async () => {
        let disconnectedRoomId = null;
        let disconnectedUserNickname = null;

        for (const [roomId, room] of rooms.entries()) {
            if (room.users.has(socket.id)) {
                const user = room.users.get(socket.id);
                disconnectedRoomId = roomId;
                disconnectedUserNickname = user.nickname;
                room.users.delete(socket.id);

                const disconnectNotification = {
                    room_id: disconnectedRoomId,
                    sender_nickname: 'system',
                    content: `${disconnectedUserNickname} disconnected`,
                    type: 'notification',
                    timestamp: new Date().toISOString()
                };

                await supabase
                    .from('messages')
                    .insert([disconnectNotification]);

                socket.to(disconnectedRoomId).emit('userLeft', { nickname: disconnectedUserNickname });
                const updatedRoom = rooms.get(disconnectedRoomId);
                io.to(disconnectedRoomId).emit('userCount', { count: updatedRoom ? updatedRoom.users.size : 0 });

                if (updatedRoom && updatedRoom.users.size === 0) {
                    rooms.delete(disconnectedRoomId);
                }

                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
