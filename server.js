require('dotenv').config();

// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt'); // Import bcrypt
const saltRounds = 10; // Define salt rounds for bcrypt

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize Supabase client (using Service Role Key for server-side operations)
const supabaseUrl = 'https://xddulsxzqlwyzucyeywq.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

app.use(express.static('public'));

// Store active rooms and their metadata in memory for quick access
// This map will now primarily store room details fetched from or inserted into the 'rooms' table
const rooms = new Map();

// Generate a new room, insert into Supabase 'rooms' table, and add to in-memory map
async function createRoom(expirationMinutes = 60, password, roomName = '') {
    console.log('Server: Creating room request with expiration:', expirationMinutes, 'minutes');
    
    const expirationTime = new Date(Date.now() + (expirationMinutes * 60 * 1000)); // Calculate expiration time

    let hashedPassword = null;
    if (password) {
        try {
            hashedPassword = await bcrypt.hash(password, saltRounds); // Hash the password
        } catch (e) {
            console.error('Server: Error hashing password:', e);
            throw new Error('Failed to hash password');
        }
    }

    // Insert room into Supabase 'rooms' table, letting the DB generate the ID
    const { data, error } = await supabase
        .from('rooms')
        .insert([
            {
                room_name: roomName,
                password: hashedPassword, // Store the hashed password
                expires_at: expirationTime.toISOString()
            }
        ])
        .select('id, room_name, expires_at'); // Select the generated ID and other relevant data

    if (error) {
        console.error('Server: Error inserting room into Supabase:', error);
        throw new Error('Failed to create room in database');
    }

    const roomData = data[0]; // Get the inserted room data (should be one row)
    const roomId = roomData.id; // Use the database-generated UUID as the roomId

    // Store active room data in memory
    rooms.set(roomId, {
        password,
        expirationTime: new Date(roomData.expires_at).getTime(), // Store as timestamp
        roomName: roomData.room_name,
        users: new Map(),
        // messages: [] // No longer storing messages in memory
    });

    console.log('Server: Room created in Supabase and memory:', roomId);

    // Schedule in-memory room cleanup and client notification based on the expiration time
    const delay = expirationTime.getTime() - Date.now(); // Calculate remaining time
    if (delay > 0) {
         setTimeout(() => {
            if (rooms.has(roomId)) {
                console.log('Server: In-memory room expired:', roomId);
                rooms.delete(roomId);
                // Notify clients in the room that it has expired
                io.to(roomId).emit('roomExpired');
                console.log('Server: Clients notified of room expiration.');
            }
        }, delay);
         console.log(`Server: Scheduled in-memory expiration for room ${roomId} in ${delay}ms.`);
    } else {
        // Room is already expired based on creation time, remove immediately if it somehow got here
         if (rooms.has(roomId)) {
            console.log('Server: Room already expired during creation:', roomId);
            rooms.delete(roomId);
             io.to(roomId).emit('roomExpired');
             console.log('Server: Clients notified of immediate room expiration.');
        }
    }

    return { 
        roomId, 
        expirationTime: new Date(roomData.expires_at).getTime(), 
        roomName: roomData.room_name 
    }; // Return relevant room details
}

// Verify room password by querying the Supabase 'rooms' table
async function verifyRoomPassword(roomId, password) {
    // Fetch room from database to verify password and check existence
    const { data, error } = await supabase
        .from('rooms')
        .select('password, expires_at')
        .eq('id', roomId)
        .single(); // Use single() as we expect one or zero results

    if (error && error.details !== 'The result contains 0 rows') {
        console.error('Server: Error fetching room for password verification:', error);
        return false; // Indicate verification failed due to DB error
    }

    // Check if room exists and is not expired
    const room = data;
    const isExpired = room && new Date(room.expires_at) < new Date();

    if (!room || isExpired) {
        console.log('Server: Room not found or expired for room:', roomId);
        // If the room is in DB but expired, ensure it's removed from memory
         if (room && isExpired && rooms.has(roomId)) {
             rooms.delete(roomId);
         }
        return false; // Indicate verification failed (not found or expired)
    }

    // Compare provided password with the stored hashed password
    const hashedPassword = room.password;
    let isPasswordValid = false;
    if (password && hashedPassword) {
        try {
            isPasswordValid = await bcrypt.compare(password, hashedPassword); // Compare passwords
        } catch (e) {
            console.error('Server: Error comparing passwords:', e);
            return false; // Indicate verification failed due to comparison error
        }
    } else if (!password && !hashedPassword) {
         // Allow joining passwordless rooms
         isPasswordValid = true;
    }


    if (isPasswordValid) {
        console.log('Server: Password verified for room:', roomId);
        // If room exists and password is correct, fetch/update in-memory map if needed
        if (!rooms.has(roomId) || rooms.get(roomId).password !== hashedPassword || rooms.get(roomId).expirationTime !== new Date(room.expires_at).getTime()) {
             console.log('Server: Populating/updating in-memory room data for', roomId);
              rooms.set(roomId, {
                password: hashedPassword, // Store the hashed password in memory too
                expirationTime: new Date(room.expires_at).getTime(),
                // Note: roomName is not stored in the in-memory map unless we fetch it here too.
                // For now, fetching roomName is done in joinRoom callback.
                roomName: null, // Placeholder, will be fetched in joinRoom
                users: new Map(),
            });
             // Re-schedule in-memory expiration if room was re-fetched and not expired
             const delay = new Date(room.expires_at).getTime() - Date.now();
             if (delay > 0) {
                 setTimeout(() => {
                    if (rooms.has(roomId)) {
                        console.log('Server: In-memory room expired (rescheduled):', roomId);
                        rooms.delete(roomId);
                        io.to(roomId).emit('roomExpired');
                        console.log('Server: Clients notified of room expiration (rescheduled).');
                    }
                }, delay);
                console.log(`Server: Rescheduled in-memory expiration for room ${roomId} in ${delay}ms.`);
             } else {
                  // If re-fetched and already expired, remove from in-memory if present
                 if (rooms.has(roomId)) {
                      console.log('Server: Re-fetched expired room, removing from memory:', roomId);
                      rooms.delete(roomId);
                       io.to(roomId).emit('roomExpired');
                       console.log('Server: Clients notified of immediate room expiration (re-fetched).');
                  }
             }
        }
        return true;
    } else {
        console.log('Server: Room not found or invalid password for room:', roomId);
        return false; // Indicate verification failed (not found or wrong password)
    }
}

io.on('connection', socket => {
    console.log('Server: A user connected:', socket.id);

    // Create a new room
    socket.on('createRoom', async ({ expirationMinutes, password, roomName }, callback) => {
        console.log('Server: Create room request:', { expirationMinutes, password, roomName });
        try {
            // Use the updated createRoom function that interacts with Supabase
            const { roomId, expirationTime, roomName: createdRoomName } = await createRoom(expirationMinutes, password, roomName);
            console.log('Server: Room created successfully:', roomId);
            // Auto-join the creator to the room after creation
             // We need to call the joinRoom logic here or a simplified version
            socket.emit('autoJoinRoom', { roomId, password, nickname: 'Creator' }); // Emit an event for the client to auto-join
            callback({ roomId, expirationTime, roomName: createdRoomName });
        } catch (error) {
            console.error('Server: Error creating room:', error);
            callback({ error: 'Failed to create room' });
        }
    });

    // Join a room
    socket.on('joinRoom', async ({ roomId, password, nickname }, callback) => {
        console.log('Server: Join room request:', { roomId, nickname });
        
        // 1. Verify room existence and password against the database
        const isPasswordValid = await verifyRoomPassword(roomId, password);

        if (!isPasswordValid) {
            // Check if the room is just not found or expired for a more specific message
             const { data: roomExists, error: checkError } = await supabase
                 .from('rooms')
                 .select('id, expires_at')
                 .eq('id', roomId)
                 .single();

            if (checkError && checkError.details !== 'The result contains 0 rows') {
                 console.error('Server: Error checking room existence:', checkError);
                 callback({ success: false, message: 'An error occurred while verifying room.' });
                 return;
            }
            
             if (!roomExists) {
                console.log('Server: Join failed - Room not found:', roomId);
                callback({ success: false, message: 'Room not found' });
             } else if (new Date(roomExists.expires_at) < new Date()) {
                 console.log('Server: Join failed - Room expired:', roomId);
                callback({ success: false, message: 'Room has expired.' });
             } else {
                 console.log('Server: Join failed - Invalid password for room:', roomId);
                 callback({ success: false, message: 'Invalid password' });
             }
            return;
        }

        // 2. Check for duplicate nicknames in memory (for active users)
        const room = rooms.get(roomId); // Get the in-memory room data
         if (!room) {
             // This case should ideally not happen if verifyRoomPassword populates memory,
             // but as a fallback, if room is not in memory but exists/valid in DB, re-populate
              console.log('Server: Room valid in DB but not in memory, fetching details...');
              const { data: dbRoom, error: dbFetchError } = await supabase
                   .from('rooms')
                   .select('*') // Fetch all details to populate memory
                   .eq('id', roomId)
                   .single();

                if (dbFetchError) {
                     console.error('Server: Error fetching room details for re-population:', dbFetchError);
                     callback({ success: false, message: 'An error occurred while joining.' });
                     return;
                }
              // Populate in-memory map
               rooms.set(roomId, {
                   password: dbRoom.password,
                   expirationTime: new Date(dbRoom.expires_at).getTime(),
                   roomName: dbRoom.room_name,
                   users: new Map(),
               });
             const updatedRoom = rooms.get(roomId);
             // Schedule in-memory expiration for the re-populated room
             const delay = new Date(dbRoom.expires_at).getTime() - Date.now();
             if (delay > 0) {
                 setTimeout(() => {
                    if (rooms.has(roomId)) {
                         console.log('Server: Re-populated in-memory room expired:', roomId);
                         rooms.delete(roomId);
                         io.to(roomId).emit('roomExpired');
                         console.log('Server: Clients notified of room expiration (re-populated).');
                     }
                 }, delay);
                  console.log(`Server: Rescheduled in-memory expiration for room ${roomId} in ${delay}ms (re-populated).`);
             } else {
                  // If re-populated and already expired, remove immediately
                  if (rooms.has(roomId)) {
                      console.log('Server: Re-populated expired room, removing from memory:', roomId);
                      rooms.delete(roomId);
                       io.to(roomId).emit('roomExpired');
                       console.log('Server: Clients notified of immediate room expiration (re-populated).');
                  }
                  callback({ success: false, message: 'Room has expired.' }); // Should have been caught by verify, but double-check
                  return;
             }
             const finalRoom = rooms.get(roomId); // Get the fully populated room

             // Check for duplicate nicknames against the fully populated room
              for (const user of finalRoom.users.values()) {
                 if (user.nickname === nickname) {
                     callback({ success: false, message: 'This nickname is already in use in this room.' });
                     return;
                 }
             }


         } else { // Room is already in memory
              for (const user of room.users.values()) {
                 if (user.nickname === nickname) {
                     callback({ success: false, message: 'This nickname is already in use in this room.' });
                     return;
                 }
             }
         }

        // If we reach here, room is valid and nickname is available

        // Join socket.io room
        socket.join(roomId);
        // Store user info in-memory
         const currentRoom = rooms.get(roomId); // Get the potentially re-populated room
         currentRoom.users.set(socket.id, { nickname });

        // 3. Fetch message history from Supabase 'messages' table
        const { data: messages, error: fetchError } = await supabase
            .from('messages')
            .select('id, room_id, sender_nickname, content, type, timestamp, file_url, file_type') // Select necessary columns
            .eq('room_id', roomId)
            .order('timestamp', { ascending: true });

        if (fetchError) {
            console.error('Server: Error fetching message history from Supabase:', fetchError);
            // Decide how to handle this error - maybe proceed with an empty history or send an error to the client
             const roomHistory = []; // Use an empty array on error
             console.log('Server: Proceeding with empty history due to fetch error.');
        } else {
            console.log('Server: Fetched message history from Supabase:', messages);
            const roomHistory = messages || []; // Use fetched messages or empty array
        }

        // 4. Insert join notification into Supabase 'messages' table
         const joinNotification = {
            room_id: roomId,
            sender_nickname: 'system', // Or a system indicator
            content: `${nickname} joined the room`,
            type: 'notification',
            timestamp: new Date().toISOString(), // Use ISO string for Supabase timestamp
             // No expiration_time needed in messages table anymore
         };

        const { data: notificationData, error: notificationError } = await supabase
            .from('messages')
            .insert([joinNotification]);

        if (notificationError) {
             console.error('Server: Error inserting join notification into Supabase:', notificationError);
             // Log the error but don't necessarily stop the join process
        } else {
             console.log('Server: Join notification inserted into Supabase:', notificationData);
             // Optionally, emit the notification to existing users in the room via Realtime or Socket.IO
             // Supabase Realtime on the client should handle displaying this.
        }


        // 5. Notify others about the new user via Socket.IO
        socket.to(roomId).emit('userJoined', { nickname });
        // Emit updated user count to all in room
         const updatedRoom = rooms.get(roomId); // Get the room again as users map might have changed
        io.to(roomId).emit('userCount', { count: updatedRoom ? updatedRoom.users.size : 0 });
        console.log('Server: User joined room:', { roomId, nickname, usersCount: updatedRoom ? updatedRoom.users.size : 0 });
        
        // 6. Send room history and metadata to the joining client
         // Fetch room details again to ensure latest data for the callback, including roomName
         const { data: finalRoomDetails, error: finalFetchError } = await supabase
              .from('rooms')
              .select('room_name, expires_at')
              .eq('id', roomId)
              .single();

         if (finalFetchError) {
             console.error('Server: Error fetching final room details for join callback:', finalFetchError);
             // Proceed with potentially incomplete room data or handle as error
             callback({ success: false, message: 'Failed to retrieve complete room details.' });
             return;
         }

        callback({ 
            success: true, 
            messages: messages || [], // Send fetched messages
            users: Array.from(currentRoom.users.values()), // Send active users in memory
            roomName: finalRoomDetails.room_name,
            expirationTime: new Date(finalRoomDetails.expires_at).getTime() // Send expiration time
        });
    });

    // Handle encrypted messages and insert into Supabase 'messages' table
    socket.on('message', async ({ roomId, encryptedMessage, fileUrl = null, fileType = null }) => { // Added fileUrl and fileType parameters
        const room = rooms.get(roomId);
        if (!room) {
            console.log('Server: Message received for non-existent or expired in-memory room:', roomId);
             // Optionally, try fetching from DB to see if it exists but is just not in memory
             // For now, we'll ignore messages to rooms not in memory.
            return;
        }

        const user = room.users.get(socket.id);
        if (!user) {
             console.log('Server: Message received from user not in in-memory room user list:', socket.id);
            return;
        }

        // Determine message type based on file presence
        const messageType = fileUrl && fileType ? (fileType.startsWith('image') ? 'image' : fileType.startsWith('video') ? 'video' : 'file') : 'text';

        const message = {
            id: uuidv4(), // Generate a new UUID for the message
            room_id: roomId, // Link to the room using the correct UUID
            sender_nickname: user.nickname,
            content: encryptedMessage, // Content can be text message or media caption
            type: messageType, // 'text', 'image', 'video', or 'file'
            timestamp: new Date().toISOString(), // Use ISO string for Supabase timestamp
            file_url: fileUrl, // Include file URL if it's a media message
            file_type: fileType, // Include file type if it's a media message
            // No expiration_time needed in messages table anymore
        };

        // Insert message into Supabase 'messages' table
        const { data, error } = await supabase
            .from('messages')
            .insert([message]);

        if (error) {
            console.error('Server: Error inserting message into Supabase:', error);
        } else {
            console.log('Server: Message inserted into Supabase:', data);
             // Emit the message after successful insertion into Supabase
             // Supabase Realtime on the client will also receive this, but emitting via Socket.IO
             // ensures immediate delivery to currently connected clients without waiting for Realtime.
             // Consider if you want to rely solely on Realtime or use both.
             // For now, let's keep Socket.IO emit for active users.
            io.to(roomId).emit('message', message);
        }
    });

    // Handle leaveRoom event (Insert notification into DB and update in-memory)
    socket.on('leaveRoom', async (roomId) => { // Made async to insert into DB
        const room = rooms.get(roomId);
        if (room && room.users.has(socket.id)) {
            const user = room.users.get(socket.id);
            room.users.delete(socket.id);

            // Insert leave notification into Supabase 'messages' table
             const leaveNotification = {
                room_id: roomId,
                sender_nickname: 'system', // Or a system indicator
                content: `${user.nickname} left the room`,
                type: 'notification',
                timestamp: new Date().toISOString(),
                 // No expiration_time needed in messages table
             };

            const { data: notificationData, error: notificationError } = await supabase
                .from('messages')
                .insert([leaveNotification]);

            if (notificationError) {
                 console.error('Server: Error inserting leave notification into Supabase:', notificationError);
                 // Log the error but don't necessarily stop the leave process
            } else {
                 console.log('Server: Leave notification inserted into Supabase:', notificationData);
                 // Optionally, emit the notification to remaining users via Realtime or Socket.IO
                 // Supabase Realtime on the client should handle displaying this.
            }

            // Notify others via Socket.IO
            socket.to(roomId).emit('userLeft', { nickname: user.nickname });
            // Emit updated user count to all in room
             const updatedRoom = rooms.get(roomId); // Get the room again as users map might have changed
            io.to(roomId).emit('userCount', { count: updatedRoom ? updatedRoom.users.size : 0 });
            console.log('Server: User left room:', { roomId, nickname: user.nickname });

            // Optional: If room is empty, consider removing it from in-memory map immediately
             if (updatedRoom && updatedRoom.users.size === 0) {
                 console.log('Server: Room is empty, removing from in-memory map:', roomId);
                 rooms.delete(roomId);
             }
        }
    });

    // Handle disconnection (Insert notification into DB and update in-memory)
    socket.on('disconnect', async () => { // Made async to insert into DB
        console.log('Server: User disconnected:', socket.id);
        // Find which room the disconnected socket was in (if any)
        let disconnectedRoomId = null;
        let disconnectedUserNickname = null;

        // Iterate through rooms to find the disconnecting user
        for (const [roomId, room] of rooms.entries()) {
            if (room.users.has(socket.id)) {
                const user = room.users.get(socket.id);
                disconnectedRoomId = roomId;
                disconnectedUserNickname = user.nickname;
                room.users.delete(socket.id);

                 // Insert disconnect notification into Supabase 'messages' table
                 const disconnectNotification = {
                    room_id: disconnectedRoomId,
                    sender_nickname: 'system', // Or a system indicator
                    content: `${disconnectedUserNickname} disconnected`,
                    type: 'notification',
                    timestamp: new Date().toISOString(),
                     // No expiration_time needed in messages table
                 };

                const { data: notificationData, error: notificationError } = await supabase
                    .from('messages')
                    .insert([disconnectNotification]);

                if (notificationError) {
                     console.error('Server: Error inserting disconnect notification into Supabase:', notificationError);
                     // Log the error
                } else {
                     console.log('Server: Disconnect notification inserted into Supabase:', notificationData);
                     // Supabase Realtime on the client should handle displaying this.
                }

                // Notify others via Socket.IO
                socket.to(disconnectedRoomId).emit('userLeft', { nickname: disconnectedUserNickname });
                 // Emit updated user count to all in room
                 const updatedRoom = rooms.get(disconnectedRoomId); // Get the room again
                 io.to(disconnectedRoomId).emit('userCount', { count: updatedRoom ? updatedRoom.users.size : 0 });
                console.log('Server: User disconnected from room:', { roomId: disconnectedRoomId, nickname: disconnectedUserNickname, usersCount: updatedRoom ? updatedRoom.users.size : 0 });

                 // Optional: If room is empty after disconnect, consider removing it from in-memory
                 if (updatedRoom && updatedRoom.users.size === 0) {
                     console.log('Server: Room is empty after disconnect, removing from in-memory map:', disconnectedRoomId);
                     rooms.delete(disconnectedRoomId);
                 }

                // Assuming a socket is only in one room at a time, we can stop searching
                break;
            }
        }


    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
