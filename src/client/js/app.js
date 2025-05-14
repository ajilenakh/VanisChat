// Import Signal Protocol functions
import { initializeSignalProtocol, encryptMessage, decryptMessage } from './signalProtocol.js';

// Initialize Socket.io connection
const socket = io();

// State management
let currentState = {
    roomId: null,
    userId: null,
    userName: null,
    signalProtocol: null,
    sessions: new Map(),
};

// DOM Elements
const screens = {
    welcome: document.getElementById('welcome-screen'),
    createRoom: document.getElementById('create-room-screen'),
    joinRoom: document.getElementById('join-room-screen'),
    chatRoom: document.getElementById('chat-room-screen'),
};

const forms = {
    createRoom: document.getElementById('create-room-form'),
    joinRoom: document.getElementById('join-room-form'),
    message: document.getElementById('message-form'),
};

// Screen Management
function showScreen(screenId) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenId].classList.add('active');
}

// Event Listeners
document.getElementById('create-room-btn').addEventListener('click', () => {
    showScreen('createRoom');
});

document.getElementById('join-room-btn').addEventListener('click', () => {
    showScreen('joinRoom');
});

// Back button functionality
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        showScreen('welcome');
    });
});

// Create Room Form
forms.createRoom.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('room-password').value;
    const duration = document.getElementById('room-duration').value;
    const creator = document.getElementById('creator-name').value;

    // Validate inputs
    if (!password || !creator) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        console.log('Sending create room request:', { creator, duration });
        
        const response = await fetch('/api/rooms/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                password, 
                duration: (parseInt(duration) || 30) * 60, // Convert minutes to seconds
                creator 
            }),
        });

        const data = await response.json();
        console.log('Create room response:', data);
        
        if (data.success) {
            currentState.roomId = data.roomId;
            currentState.userName = creator;
            currentState.userId = socket.id;
            
            // Initialize Signal Protocol (can be null for now)
            currentState.signalProtocol = await initializeSignalProtocol();
            
            // Join socket room
            socket.emit('join_room', {
                roomId: data.roomId,
                userId: socket.id,
                userName: creator,
            });

            showScreen('chatRoom');
            updateRoomInfo(data.roomId, data.expiresAt);
            startRoomTimer(data.expiresAt);
        } else {
            alert('Failed to create room: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Failed to create room. Please check the console for details.');
    }
});

// Join Room Form
forms.joinRoom.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const roomId = document.getElementById('room-id').value;
    const password = document.getElementById('join-password').value;
    const name = document.getElementById('participant-name').value;

    try {
        const response = await fetch('/api/rooms/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ roomId, password, name }),
        });

        const data = await response.json();
        
        if (data.success) {
            currentState.roomId = roomId;
            currentState.userName = name;
            currentState.userId = socket.id;
            
            // Initialize Signal Protocol with received bundle
            currentState.signalProtocol = await initializeSignalProtocol(data.signalProtocol);
            
            // Join socket room
            socket.emit('join_room', {
                roomId,
                userId: socket.id,
                userName: name,
            });

            showScreen('chatRoom');
            updateRoomInfo(roomId, data.room.expiresAt);
            startRoomTimer(data.room.expiresAt);
        } else {
            alert('Failed to join room: ' + data.error);
        }
    } catch (error) {
        console.error('Error joining room:', error);
        alert('Failed to join room. Please try again.');
    }
});

// Message Form
forms.message.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (!message) return;

    try {
        // Encrypt message for each participant
        const encryptedMessages = await Promise.all(
            Array.from(currentState.sessions.values()).map(async (session) => {
                const encrypted = await encryptMessage(message, session);
                return {
                    recipientId: session.recipientId,
                    message: encrypted,
                };
            })
        );

        // Send encrypted messages
        socket.emit('send_message', {
            roomId: currentState.roomId,
            messages: encryptedMessages,
        });

        // Add message to chat
        addMessageToChat(message, currentState.userName, true);
        messageInput.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
});

// File Upload
document.getElementById('file-upload-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        // Check file size
        if (file.size > process.env.MAX_FILE_SIZE) {
            alert('File size exceeds limit');
            return;
        }

        // Read file as ArrayBuffer
        const buffer = await file.arrayBuffer();

        // Encrypt file for each participant
        const encryptedFiles = await Promise.all(
            Array.from(currentState.sessions.values()).map(async (session) => {
                const encrypted = await encryptMessage(buffer, session);
                return {
                    recipientId: session.recipientId,
                    file: encrypted,
                    fileName: file.name,
                    fileType: file.type,
                };
            })
        );

        // Send encrypted files
        socket.emit('send_file', {
            roomId: currentState.roomId,
            files: encryptedFiles,
        });

        // Add file message to chat
        addFileMessageToChat(file.name, currentState.userName, true);
    } catch (error) {
        console.error('Error sending file:', error);
        alert('Failed to send file. Please try again.');
    }
});

// Socket.io Event Handlers
socket.on('user_joined', (data) => {
    addParticipantToList(data.userName);
    addSystemMessage(`${data.userName} joined the room`);
});

socket.on('user_left', (data) => {
    removeParticipantFromList(data.userName);
    addSystemMessage(`${data.userName} left the room`);
});

socket.on('message', async (data) => {
    try {
        // Decrypt message
        const session = currentState.sessions.get(data.senderId);
        if (!session) return;

        const decrypted = await decryptMessage(data.message, session);
        addMessageToChat(decrypted, data.senderName, false);
    } catch (error) {
        console.error('Error decrypting message:', error);
    }
});

socket.on('file', async (data) => {
    try {
        // Decrypt file
        const session = currentState.sessions.get(data.senderId);
        if (!session) return;

        const decrypted = await decryptMessage(data.file, session);
        addFileMessageToChat(data.fileName, data.senderName, false, decrypted);
    } catch (error) {
        console.error('Error decrypting file:', error);
    }
});

// UI Update Functions
function updateRoomInfo(roomId, expiresAt) {
    document.getElementById('room-id-display').textContent = roomId;
    document.getElementById('room-timer').textContent = formatTimeRemaining(expiresAt);
}

function startRoomTimer(expiresAt) {
    const timer = setInterval(() => {
        const timeRemaining = formatTimeRemaining(expiresAt);
        document.getElementById('room-timer').textContent = timeRemaining;

        if (new Date(expiresAt) <= new Date()) {
            clearInterval(timer);
            showScreen('welcome');
            alert('Chat room has expired');
        }
    }, 1000);
}

function formatTimeRemaining(expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function addMessageToChat(message, sender, isSent) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const senderElement = document.createElement('div');
    senderElement.className = 'sender';
    senderElement.textContent = sender;
    
    const contentElement = document.createElement('div');
    contentElement.className = 'content';
    contentElement.textContent = message;
    
    messageElement.appendChild(senderElement);
    messageElement.appendChild(contentElement);
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addFileMessageToChat(fileName, sender, isSent, fileData = null) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const senderElement = document.createElement('div');
    senderElement.className = 'sender';
    senderElement.textContent = sender;
    
    const contentElement = document.createElement('div');
    contentElement.className = 'content file-message';
    
    if (fileData) {
        const fileUrl = URL.createObjectURL(new Blob([fileData]));
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        link.textContent = `📎 ${fileName}`;
        contentElement.appendChild(link);
    } else {
        contentElement.textContent = `📎 ${fileName}`;
    }
    
    messageElement.appendChild(senderElement);
    messageElement.appendChild(contentElement);
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addSystemMessage(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message system';
    messageElement.textContent = message;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addParticipantToList(userName) {
    const participantsList = document.getElementById('participants-list');
    const li = document.createElement('li');
    li.textContent = userName;
    li.id = `participant-${userName}`;
    participantsList.appendChild(li);
}

function removeParticipantFromList(userName) {
    const li = document.getElementById(`participant-${userName}`);
    if (li) li.remove();
} 