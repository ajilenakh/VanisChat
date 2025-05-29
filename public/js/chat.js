document.addEventListener('DOMContentLoaded', function() {
// Initialize Socket.IO
const socket = io();

// DOM Elements
const createForm = document.getElementById('create-form');
const joinForm = document.getElementById('join-form');
const chatContainer = document.getElementById('chat-container');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const roomTitle = document.getElementById('room-title');
const onlineCount = document.getElementById('online-count');
const leaveButton = document.getElementById('leave-room');

// Current room state
let currentRoom = {
    id: null,
    password: null,
    nickname: null,
    name: null, // Store room name
    expirationTime: null // Added for expiration tracking
};

// Invite link auto-fill logic
const urlParams = new URLSearchParams(window.location.search);
const prefillRoomId = urlParams.get('room');
const prefillPassword = urlParams.get('pw');
if (prefillRoomId && prefillPassword) {
    // Pre-fill the join form
    document.querySelector('#join-form input[placeholder="Room ID"]').value = prefillRoomId;
    document.querySelector('#join-form input[placeholder="Room Password"]').value = prefillPassword;
    // Switch to join tab
    switchForm('join');
    // Focus nickname input
    document.querySelector('#join-form input[placeholder="Your Nickname"]').focus();
}

// Supabase Integration (Assuming supabase client is initialized in superbase.js)

// Function to insert a message into Supabase
async function insertMessage(roomId, nickname, content, type = 'chat', fileUrl = null, fileType = null) {
    console.log('Inserting message into Supabase with content:', content);
    const { data, error } = await supabase
        .from('messages')
        .insert([{
            room_id: roomId,
            sender_nickname: nickname,
            content: content,
            type: type,
            file_url: fileUrl,
            file_type: fileType,
            timestamp: new Date().toISOString()
        }])
        .select(); // Add .select() to get the inserted data back
    if (error) {
        console.error('Error inserting message:', error);
        return false;
    }
    console.log('Message insertion result:', data);
    return data !== null && data.length > 0; // Return true only if data is returned
}

// Listen for new messages via Supabase Realtime
let messageSubscription = null;
let messageChannel = null; // Keep track of the channel

function startMessageSubscription(roomId) {
    console.log(`Attempting to subscribe to messages for room: ${roomId}`);
    // Unsubscribe from previous channel if it exists
    if (messageChannel) {
        console.log('Unsubscribing from previous channel.');
        messageChannel.unsubscribe();
        // Optional: remove the channel completely if you won't reuse the name
        // supabase.removeChannel(messageChannel);
        messageChannel = null;
    }

    // Create a Realtime channel for the specific room and listen for inserts
    messageChannel = supabase.channel(`room:${roomId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
            (payload) => {
                console.log('Realtime event received:', payload);
                console.log('New message received from Supabase Realtime:', payload.new);

                // Check if the message was sent by the current user
                if (currentRoom.nickname && payload.new.sender_nickname === currentRoom.nickname) {
                    console.log('Skipping display for message sent by current user.');
                    return; // Don't display messages sent by the current user via Realtime
                }

                // Display the message received from Supabase (if not sent by current user)
                displayMessage(payload.new); // payload.new is the message object
            }
        )
        .subscribe((status, err) => {
            console.log(`Subscription status for room:${roomId}: ${status}`);
            if (err) {
                console.error(`Subscription error for room:${roomId}:`, err);
            }
        });
    
    console.log(`Subscription process initiated for room: ${roomId}`);
}

// Create room
createForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent form submission
    const nickname = createForm.querySelector('input[placeholder="Your Nickname"]').value;
    const roomName = createForm.querySelector('input[placeholder="Room Name"]').value;
    const password = createForm.querySelector('input[placeholder="Set a Password"]').value;
    const expirationMinutes = parseInt(createForm.querySelector('input[placeholder="Expiration (minutes)"]').value) || 60;
    
    // Create room with custom password (server still handles room metadata)
    socket.emit('createRoom', { expirationMinutes, password, roomName }, (response) => {
        if (response.roomId) {
            currentRoom = {
                id: response.roomId,
                password: password,
                nickname: nickname,
                name: response.roomName,
                expirationTime: response.expirationTime
            };
            
            // Join the room
            joinRoom(response.roomId, password, nickname, response.roomName, response.expirationTime);
        } else {
            alert('Failed to create room. Please try again.');
        }
    });
});

// Join room
joinForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent form submission
    const nickname = joinForm.querySelector('input[placeholder="Your Nickname"]').value;
    const roomId = joinForm.querySelector('input[placeholder="Room ID"]').value;
    const password = joinForm.querySelector('input[placeholder="Room Password"]').value;
    
    joinRoom(roomId, password, nickname);
});

function joinRoom(roomId, password, nickname, roomName = null, expirationTime = null) {
    socket.emit('joinRoom', { roomId, password, nickname }, async (response) => { // Use async here
        if (response.success) {
            currentRoom = {
                id: roomId,
                password,
                nickname,
                name: response.roomName || roomName,
                expirationTime: response.expirationTime || expirationTime
            };
            showChat();

            // Fetch message history from Supabase
            const { data: messages, error } = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', roomId)
                .order('timestamp', { ascending: true });

            if (error) {
                console.error('Error fetching message history:', error);
            } else {
                console.log('Fetched message history:', messages);
                messages.forEach(msg => displayMessage(msg));
            }

            // Start Realtime subscription for new messages
            startMessageSubscription(roomId);

            // Update header (userCount is still handled by Socket.IO)
            updateRoomHeader();

        } else {
            alert(response.message || 'Failed to join room. Please check your credentials.');
        }
    });
}

function updateRoomHeader() {
    if (!roomTitle) return;
    if (currentRoom.name && currentRoom.id && currentRoom.password) {
        // Calculate time remaining (if available)
        let timeText = '';
        if (currentRoom.expirationTime) {
            const msLeft = currentRoom.expirationTime - Date.now();
            if (msLeft > 0) {
                const min = Math.floor(msLeft / 60000);
                const sec = Math.floor((msLeft % 60000) / 1000);
                timeText = `<span class='room-timer'>Time left: ${min}m ${sec}s</span>`;
            }
        }
        // Generate invite link
        const inviteLink = `${window.location.origin}/?room=${encodeURIComponent(currentRoom.id)}&pw=${encodeURIComponent(currentRoom.password)}`;
        roomTitle.innerHTML = `
            <div class="room-header-flex">
                <span class="room-label">
                  Room: <span class="room-name">${currentRoom.name}</span>
                  <button id="copy-invite-link" class="copy-id-btn" title="Copy Invite Link" style="margin-left:0.5em;">
                    <span class="room-id-btn-label">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.5 8.5V6.5C15.5 4.84315 14.1569 3.5 12.5 3.5H7.5C5.84315 3.5 4.5 4.84315 4.5 6.5V8.5" stroke="currentColor" stroke-width="1.5"/>
                        <rect x="4.5" y="8.5" width="11" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M10 12V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <path d="M10 14H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                    </span>
                  </button>
                </span>
                <span class="room-header-timer">${timeText}</span>
            </div>
        `;
        // Add copy event
        const copyBtn = document.getElementById('copy-invite-link');
        if (copyBtn) {
            copyBtn.onclick = function() {
                navigator.clipboard.writeText(inviteLink);
                copyBtn.innerHTML = `<span class='room-id-btn-label'>
                  <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M5 11l4 4L15 7' stroke='#22c55e' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/></svg>
                </span>`;
                setTimeout(() => {
                    copyBtn.innerHTML = `<span class='room-id-btn-label'>
                      <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
                        <path d='M15.5 8.5V6.5C15.5 4.84315 14.1569 3.5 12.5 3.5H7.5C5.84315 3.5 4.5 4.84315 4.5 6.5V8.5' stroke='currentColor' stroke-width='1.5'/>
                        <rect x='4.5' y='8.5' width='11' height='8' rx='2' stroke='currentColor' stroke-width='1.5'/>
                        <path d='M10 12V10' stroke='currentColor' stroke-width='1.5' stroke-linecap='round'/>
                        <path d='M10 14H10.01' stroke='currentColor' stroke-width='1.5' stroke-linecap='round'/>
                      </svg>
                    </span>`;
                }, 1200);
            };
        }
    } else if (currentRoom.name) {
        roomTitle.innerHTML = `<span class="room-label">Room: <span class="room-name">${currentRoom.name}</span></span>`;
    } else {
        roomTitle.textContent = 'Room';
    }
}

// Timer to update time left in header
let timeLeftInterval = null;
function startTimeLeftUpdater() {
    if (timeLeftInterval) clearInterval(timeLeftInterval);
    timeLeftInterval = setInterval(() => {
        updateRoomHeader();
    }, 1000);
}
function stopTimeLeftUpdater() {
    if (timeLeftInterval) clearInterval(timeLeftInterval);
    timeLeftInterval = null;
}

// Send message
messageForm.addEventListener('submit', async (e) => { // Made async for insertMessage
    e.preventDefault(); // Prevent form submission
    const messageText = messageInput.value.trim();
    if (!messageText || !currentRoom.id || !currentRoom.password || !currentRoom.nickname) return;

    // Encrypt message (using room password as encryption key)
    const encryptedContent = CryptoJS.AES.encrypt(messageText, currentRoom.password).toString();
    
    console.log('Sending encrypted content:', encryptedContent);

    // Insert message into Supabase instead of emitting via Socket.IO
    // Wait for insertion to complete and get the inserted message object
    const { data: insertedMessages, error: insertError } = await supabase
        .from('messages')
        .insert([{
            room_id: currentRoom.id,
            sender_nickname: currentRoom.nickname,
            content: encryptedContent,
            type: 'chat',
            timestamp: new Date().toISOString()
        }])
        .select(); // Get the inserted data back

    if (insertError) {
        console.error('Error inserting message:', insertError);
        alert('Failed to send message.');
        return;
    }

    console.log('Message insertion result:', insertedMessages);

    // Display the message locally immediately after successful insertion
    if (insertedMessages && insertedMessages.length > 0) {
        displayMessage(insertedMessages[0]);
        messageInput.value = ''; // Clear input only if message sent
    } else {
        console.warn('Message inserted but no data returned.', insertedMessages);
         alert('Failed to confirm message sent.');
    }
});

// Display message (handles both chat and notification types)
function displayMessage(message) {
    console.log('Displaying message:', message);
    if (message.type === 'notification') {
        const notification = document.createElement('div');
        notification.classList.add('notification');
        notification.textContent = message.content;
        messagesContainer.appendChild(notification);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return;
    } else if (message.type === 'chat') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
    
        // Always try to decrypt
        let content = message.content;
        let decryptedContent = '';
        if (content) {
             try {
                const bytes = CryptoJS.AES.decrypt(content, currentRoom.password);
                decryptedContent = bytes.toString(CryptoJS.enc.Utf8);
                if (!decryptedContent) {
                    console.warn('Decryption resulted in empty string, showing encrypted content or placeholder.');
                    decryptedContent = '(Undecryptable Message)';
                }
            } catch (e) {
                console.error('Failed to decrypt message:', e);
                decryptedContent = '(Error decrypting message)';
            }
        }
    
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="sender">${message.sender_nickname || 'Unknown'}</span>
                <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${decryptedContent}</div>
        `;
    
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else if (message.type === 'media') {
         const messageElement = document.createElement('div');
         messageElement.classList.add('message');
         // For media, display the image
         messageElement.innerHTML = `
            <div class="message-header">
                 <span class="sender">${message.sender_nickname || 'Unknown'}</span>
                 <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
             </div>
             <div class="message-content">
                 <img src="${message.file_url}" alt="Media File" style="max-width: 100%; height: auto;"/>
             </div>
         `;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Socket event handlers (Socket.IO is still used for presence and room metadata)
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Remove: socket.on('message', ...); // Messages come from Supabase Realtime now

socket.on('userJoined', ({ nickname }) => {
    // This event is still emitted by the server for real-time notifications
    // but the history comes from Supabase
    console.log(`${nickname} joined`);
    // displayMessage({ type: 'notification', text: `${nickname} joined the room`, timestamp: Date.now() }); // Handled by history fetch now
});

socket.on('userLeft', ({ nickname }) => {
    // This event is still emitted by the server for real-time notifications
    // but the history comes from Supabase
     console.log(`${nickname} left`);
    // displayMessage({ type: 'notification', text: `${nickname} left the room`, timestamp: Date.now() }); // Handled by history fetch now
});

socket.on('roomExpired', () => {
    alert('This room has expired');
    hideChat();
});

socket.on('userCount', ({ count }) => {
    updateOnlineCount(count);
});

// UI helpers
function showChat() {
    document.querySelector('.form-container').classList.add('hidden');
    setTimeout(() => {
        chatContainer.classList.remove('hidden');
        messageInput.focus();
        updateRoomHeader();
        startTimeLeftUpdater();
    }, 300);
}

function hideChat() {
    chatContainer.classList.add('hidden');
    setTimeout(() => {
        document.querySelector('.form-container').classList.remove('hidden');
        currentRoom = { id: null, password: null, nickname: null, name: null, expirationTime: null };
        messagesContainer.innerHTML = '';
        stopTimeLeftUpdater();
        // Unsubscribe from Supabase Realtime channel on leaving
        if (messageChannel) {
           messageChannel.unsubscribe();
           // supabase.removeChannel(messageChannel); // Optional
           messageChannel = null;
       }
    }, 300);
}

function updateOnlineCount(count) {
    onlineCount.textContent = `${count} online`;
}

// Leave room
leaveButton.addEventListener('click', () => {
    if (currentRoom.id) {
        socket.emit('leaveRoom', currentRoom.id);
    }
    hideChat(); // Hide chat immediately on leave
});

}); // End DOMContentLoaded 