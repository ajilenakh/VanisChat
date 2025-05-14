# VanisChat

A privacy-focused, end-to-end encrypted real-time chat application that ensures zero data retention and maximum privacy.

## Features

- 🔒 End-to-end encryption using Signal Protocol
- 🚀 Real-time messaging with WebSocket
- ⏰ Self-destructing chat rooms
- 📱 Responsive and minimalist UI
- 🔐 Secure file sharing
- 🎭 Anonymous chat without account requirements

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vanischat.git
cd vanischat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and configure your environment variables:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/vanischat
REDIS_URL=redis://localhost:6379
NODE_ENV=development
MAX_ROOM_DURATION=3600
MAX_FILE_SIZE=10485760
```

4. Start the development server:
```bash
npm run dev
```

## Security Features

- End-to-end encryption using Signal Protocol
- Forward secrecy and post-compromise security
- Ephemeral message storage
- Auto-deletion of chat rooms
- Rate limiting and DDoS protection
- Secure WebSocket connections
- No message logs stored on the server

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Signal Protocol for end-to-end encryption
- Socket.io for real-time communication
- Redis for ephemeral storage
- MongoDB for temporary metadata storage 