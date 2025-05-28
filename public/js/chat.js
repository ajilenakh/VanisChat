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

// Create room
createForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent form submission
    const nickname = createForm.querySelector('input[placeholder="Your Nickname"]').value;
    const roomName = createForm.querySelector('input[placeholder="Room Name"]').value;
    const password = createForm.querySelector('input[placeholder="Set a Password"]').value;
    const expirationMinutes = parseInt(createForm.querySelector('input[placeholder="Expiration (minutes)"]').value) || 60;
    
    console.log('Creating room with:', { nickname, roomName, password, expirationMinutes }); // Debug log
    
    // Create room with custom password
    socket.emit('createRoom', { expirationMinutes, password, roomName }, (response) => {
        console.log('Room creation response:', response); // Debug log
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
            
            // Show room info
            roomTitle.textContent = `Room: ${response.roomName}`;
            showChat();
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
    
    console.log('Joining room with:', { nickname, roomId }); // Debug log
    joinRoom(roomId, password, nickname);
});

function joinRoom(roomId, password, nickname, roomName = null, expirationTime = null) {
    socket.emit('joinRoom', { roomId, password, nickname }, (response) => {
        if (response.success) {
            currentRoom = {
                id: roomId,
                password,
                nickname,
                name: response.roomName || roomName,
                expirationTime: response.expirationTime || expirationTime
            };
            showChat();
            // Display previous messages
            response.messages.forEach(msg => displayMessage(msg));
            // Update header
            updateRoomHeader();
        } else {
            alert(response.message || 'Failed to join room. Please check your credentials.');
        }
    });
}

function updateRoomHeader() {
    if (!roomTitle) return;
    if (currentRoom.name && currentRoom.id) {
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
        roomTitle.innerHTML = `
            <div class="room-header-flex">
                <span class="room-label">
                  Room: <span class="room-name">${currentRoom.name}</span>
                  <button id="copy-room-id" class="copy-id-btn" title="Copy Room ID" style="margin-left:0.5em;">
                    <span class="room-id-btn-label">ID</span>
                  </button>
                </span>
                <span class="room-header-timer">${timeText}</span>
            </div>
        `;
        // Add copy event
        const copyBtn = document.getElementById('copy-room-id');
        if (copyBtn) {
            copyBtn.onclick = function() {
                navigator.clipboard.writeText(currentRoom.id);
                copyBtn.innerHTML = `<span class='room-id-btn-label'>
                  <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M5 11l4 4L15 7' stroke='#22c55e' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/></svg>
                </span>`;
                setTimeout(() => {
                    copyBtn.innerHTML = `<span class='room-id-btn-label'>(ID)</span>`;
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
messageForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent form submission
    const message = messageInput.value.trim();
    if (!message || !currentRoom.id) return;

    // Encrypt message (using room password as encryption key)
    const encryptedMessage = CryptoJS.AES.encrypt(message, currentRoom.password).toString();
    
    socket.emit('message', {
        roomId: currentRoom.id,
        encryptedMessage
    });
    
    messageInput.value = '';
});

// Display message
function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    // Always try to decrypt
    let content = message.content;
    try {
        const decrypted = CryptoJS.AES.decrypt(message.content, currentRoom.password);
        const plain = decrypted.toString(CryptoJS.enc.Utf8);
        if (plain) content = plain;
    } catch (e) {
        console.error('Failed to decrypt message:', e);
    }

    messageElement.innerHTML = `
        <div class="message-header">
            <span class="sender">${message.sender}</span>
            <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="message-content">${content}</div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server'); // Debug log
});

socket.on('disconnect', () => {
    console.log('Disconnected from server'); // Debug log
});

socket.on('message', (message) => {
    displayMessage(message);
});

socket.on('userJoined', ({ nickname }) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = `${nickname} joined the room`;
    messagesContainer.appendChild(notification);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

socket.on('userLeft', ({ nickname }) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = `${nickname} left the room`;
    messagesContainer.appendChild(notification);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
    console.log('Hiding chat interface'); // Debug log
    chatContainer.classList.add('hidden');
    
    setTimeout(() => {
        document.querySelector('.form-container').classList.remove('hidden');
        currentRoom = { id: null, password: null, nickname: null, name: null, expirationTime: null };
        messagesContainer.innerHTML = '';
        stopTimeLeftUpdater();
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
    hideChat();
});
}); 