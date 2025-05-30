document.addEventListener('DOMContentLoaded', function() {
// Initialize Socket.IO
const socket = io();

// Dark mode toggle logic
const darkModeToggle = document.getElementById('check');
const body = document.body;

// Theme toggle logic
const toggle = document.querySelector("#theme-toggle");
const html = document.documentElement;

// Function to apply theme and update toggle state
function applyTheme(theme) {
    if (theme === 'dark') {
        body.classList.add('dark');
        body.classList.remove('light-mode-explicit'); // Remove explicit light mode class
        if (darkModeToggle) darkModeToggle.checked = true;
    } else {
        body.classList.remove('dark');
        body.classList.add('light-mode-explicit'); // Add explicit light mode class
        if (darkModeToggle) darkModeToggle.checked = false;
    }
}

// Apply theme on page load
const savedTheme = localStorage.getItem('theme');

// Check for saved preference first, then system preference
if (savedTheme) {
    applyTheme(savedTheme);
    html.setAttribute("data-theme", savedTheme);
} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Apply dark mode if system preference is dark and no saved theme
    applyTheme('dark');
    html.setAttribute("data-theme", 'dark');
} else {
    // Default to light mode if no saved theme and system preference is not dark
    applyTheme('light');
    html.setAttribute("data-theme", 'light');
}

// Listen for changes in system preference
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        // Only change if no explicit theme is set by the user
        if (!localStorage.getItem('theme')) {
            applyTheme(event.matches ? 'dark' : 'light');
            html.setAttribute("data-theme", event.matches ? 'dark' : 'light');
        }
    });
}

if (darkModeToggle) {
    darkModeToggle.addEventListener('change', function () {
        // Temporarily disable transitions for smoother toggle
        body.classList.add('no-transition');

        if (this.checked) {
            applyTheme('dark');
            localStorage.setItem('theme', 'dark');
            html.setAttribute("data-theme", 'dark');
        } else {
            applyTheme('light');
            localStorage.setItem('theme', 'light');
            html.setAttribute("data-theme", 'light');
        }

        // Re-enable transitions after a short delay
        setTimeout(() => {
            body.classList.remove('no-transition');
        }, 0);
    });
}

if (toggle) { // Check if toggle element exists
  toggle.addEventListener("click", () => {
    const current = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", current);
    localStorage.setItem("theme", current);
  });
}

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

// Get loading indicator element
const loadingIndicator = document.getElementById('loading-indicator');

// Get page title and main container elements
const pageTitle = document.querySelector('.page-title');
const mainContainer = document.querySelector('.main-container');

// Helper functions to show/hide loading indicator
function showLoading() {
    if (loadingIndicator) {
        // Make visible but initially transparent (display: flex handled by removing hidden)
        loadingIndicator.classList.remove('hidden');

        // Use requestAnimationFrame to allow display change to process before fading in
        requestAnimationFrame(() => {
            loadingIndicator.style.opacity = '1';
            loadingIndicator.style.visibility = 'visible';
        });
    }
}

function hideLoading() {
    if (loadingIndicator) {
        // Start fade-out
        loadingIndicator.style.opacity = '0';
        loadingIndicator.style.visibility = 'hidden';

        // Wait for transition to finish before setting display: none
        const transitionDuration = 300; // Match CSS transition
        setTimeout(() => {
            loadingIndicator.classList.add('hidden');
        }, transitionDuration);
    }
}

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
    
    showLoading(); // Show loading indicator

    // Create room with custom password (server still handles room metadata)
    socket.emit('createRoom', { expirationMinutes, password, roomName }, (response) => {
        hideLoading(); // Hide loading indicator in the callback
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
            // Handle creation errors more explicitly if needed, for now just alert
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
    
    showLoading(); // Show loading indicator

    joinRoom(roomId, password, nickname);
});

function joinRoom(roomId, password, nickname, roomName = null, expirationTime = null) {
    socket.emit('joinRoom', { roomId, password, nickname }, async (response) => { // Use async here
        hideLoading(); // Hide loading indicator in the callback

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

            // Start the time left updater
            startTimeLeftUpdater();

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
                // Create a temporary input element
                const tempInput = document.createElement('input');
                tempInput.value = inviteLink; // Set the text to be copied
                document.body.appendChild(tempInput); // Add to the DOM

                // Select the text and copy
                tempInput.select();
                tempInput.setSelectionRange(0, 99999); // For mobile devices
                document.execCommand('copy'); // Execute copy command

                // Clean up
                document.body.removeChild(tempInput);

                // Provide visual feedback
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
    console.log('Showing chat...');
    // hide form container and main container
    if (createForm) createForm.classList.add('hidden');
    if (joinForm) joinForm.classList.add('hidden');
    if (document.querySelector('.form-container')) document.querySelector('.form-container').classList.add('hidden');

    // hide page title and main container
    if (pageTitle) pageTitle.classList.add('hidden');
    if (mainContainer) mainContainer.classList.add('hidden');

    // Show chat container
    if (chatContainer) {
        chatContainer.classList.remove('hidden');
        // Adjust display for transitions if necessary
        chatContainer.style.display = 'flex'; // Or block, depending on layout
    }
    // Scroll to the bottom of the messages
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function hideChat() {
    console.log('Hiding chat...');
    // Show form container and main container
    if (document.querySelector('.form-container')) document.querySelector('.form-container').classList.remove('hidden');
    if (createForm) createForm.classList.remove('hidden');
    // Ensure only the active form is shown after hiding chat
    const activeFormType = document.querySelector('.tabs .tab.active').onclick.toString().match(/switchForm\('(.*?)'\)/)[1];
    switchForm(activeFormType);

    // show page title and main container
    if (pageTitle) pageTitle.classList.remove('hidden');
    if (mainContainer) mainContainer.classList.remove('hidden');

    // Hide chat container
    if (chatContainer) {
        chatContainer.classList.add('hidden');
         // Adjust display after transitions if necessary
         // chatContainer.style.display = 'none'; // This will be handled by the .hidden class CSS
    }
     // Clear messages
     if (messagesContainer) {
        messagesContainer.innerHTML = '';
     }

    // Clear room state
    currentRoom = {
        id: null,
        password: null,
        nickname: null,
        name: null,
        expirationTime: null
    };

    // Stop any active timers
    stopTimeLeftUpdater();

    // Unsubscribe from the message channel
    if (messageChannel) {
        messageChannel.unsubscribe();
        messageChannel = null;
    }

    // Optional: Reload page or navigate back if desired
    // window.location.reload();
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