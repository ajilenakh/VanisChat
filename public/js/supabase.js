import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

const supabaseUrl = 'https://xddulsxzqlwyzucyeywq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZHVsc3h6cWx3eXp1Y3lleXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MTAwMzAsImV4cCI6MjA2NDA4NjAzMH0.kWsDza_2oD59Y4WpySUMLItCkGS0dS8PTFly67qMLEk'
const supabase = createClient(supabaseUrl, supabaseKey)

// Make the supabase client globally accessible
window.supabase = supabase;

// Function to insert a message into Supabase (No longer needed, server handles this)
// async function insertMessage(roomId, nickname, content, type = 'chat', fileUrl = null, fileType = null) {
//     const { data, error } = await supabase
//         .from('messages')
//         .insert([
//             {
//                 room_id: roomId,
//                 sender_nickname: nickname,
//                 content: content, // This will be the encrypted content for 'chat' type
//                 type: type,
//                 file_url: fileUrl,
//                 file_type: fileType
//             }
//         ]);
//     if (error) {
//         console.error('Error inserting message:', error);
//         return false;
//     }
//     console.log('Message inserted:', data);
//     return true;
// }

// Listen for new messages via Supabase Realtime
let messageSubscription = null;
let messageChannel = null; // Keep track of the channel (consistent with chat.js)

function startMessageSubscription(roomId) {
    // Unsubscribe from previous channel if it exists
    if (messageChannel) {
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
                // Display the message received from Supabase (Assumes displayMessage is globally accessible)
                if (typeof displayMessage !== 'undefined') {
                     displayMessage(payload.new); // payload.new is the message object
                 } else {
                     console.warn('Client: displayMessage function not found in global scope.');
                 }
            }
        )
        .subscribe();
    
    console.log(`Subscribed to messages for room: ${roomId}`);
}

// Modify joinRoom to fetch history and start subscription (No longer needed, server handles this)
// function joinRoom(roomId, password, nickname, roomName = null, expirationTime = null) {
//     socket.emit('joinRoom', { roomId, password, nickname }, async (response) => { // Use async here
//         if (response.success) {
//             currentRoom = {
//                 id: roomId,
//                 password,
//                 nickname,
//                 name: response.roomName || roomName,
//                 expirationTime: response.expirationTime || expirationTime
//             };
//             showChat();

//             // Fetch message history from Supabase
//             const { data: messages, error } = await supabase
//                 .from('messages')
//                 .select('*')
//                 .eq('room_id', roomId)
//                 .order('timestamp', { ascending: true });

//             if (error) {
//                 console.error('Error fetching message history:', error);
//             } else {
//                 console.log('Fetched message history:', messages);
//                 messages.forEach(msg => displayMessage(msg));
//             }

//             // Start Realtime subscription for new messages
//             startMessageSubscription(roomId);

//             // Update header (userCount is still handled by Socket.IO)
//             updateRoomHeader();

//         } else {
//             alert(response.message || 'Failed to join room. Please check your credentials.');
//         }
//     });
// }

// Modify hideChat/leave logic to remove subscription (Integrated into chat.js)
// function hideChat() {
//     // ... existing code ...
//     setTimeout(() => {
//        // ... existing code ...
//        if (messageSubscription) {
//            supabase.removeSubscription(messageSubscription);
//            messageSubscription = null;
//        }
//     }, 300);
// }

// Make startMessageSubscription globally accessible if needed by chat.js
window.startMessageSubscription = startMessageSubscription;
window.messageChannel = messageChannel; // Expose channel too if needed for unsubscribe elsewhere