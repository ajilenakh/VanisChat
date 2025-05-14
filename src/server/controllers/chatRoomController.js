const { v4: uuidv4 } = require('uuid');
const store = require('../utils/inMemoryStore');
const { generateSignalProtocol } = require('../utils/signalProtocol');
const { randomBytes } = require('crypto');

class ChatRoomController {
  // Create a new chat room
  async createRoom(req, res) {
    try {
      const { password, duration, creator } = req.body;

      // Validate required fields
      if (!password || !creator) {
        return res.status(400).json({
          success: false,
          error: 'Password and creator name are required',
        });
      }

      // Validate duration
      const maxDuration = parseInt(process.env.MAX_ROOM_DURATION) || 3600; // Default to 1 hour
      const roomDuration = Math.min(parseInt(duration) || maxDuration, maxDuration);

      console.log('Creating room with:', { creator, duration: roomDuration });

      // Create room with auto-expiration
      const room = await store.createRoom({
        roomId: uuidv4(),
        password,
        creator,
        expiresAt: new Date(Date.now() + roomDuration * 1000),
        settings: {
          allowFileSharing: true,
          maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // Default to 10MB
          allowedFileTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
        },
      });

      console.log('Room created successfully:', { roomId: room.roomId });

      res.status(201).json({
        success: true,
        roomId: room.roomId,
        expiresAt: room.expiresAt,
      });
    } catch (error) {
      console.error('Error creating chat room:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create chat room',
      });
    }
  }

  // Join an existing chat room
  async joinRoom(req, res) {
    try {
      const { roomId, password, name } = req.body;

      const room = await store.getRoom(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Chat room not found',
        });
      }

      if (new Date() > room.expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'Chat room has expired',
        });
      }

      const isValidPassword = await store.verifyPassword(roomId, password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password',
        });
      }

      // Add participant to room first
      const socketId = req.body.socketId || 'temp-' + Date.now();
      await store.addParticipant(roomId, {
        socketId,
        name,
      });

      // Then generate Signal Protocol keys
      const signalProtocol = {
        identityKey: Buffer.from(randomBytes(32)).toString('base64'),
        registrationId: Math.floor(Math.random() * 16384),
        preKeys: Array.from({ length: 10 }, (_, i) => ({
          keyId: i,
          publicKey: Buffer.from(randomBytes(32)).toString('base64'),
        })),
        signedPreKey: {
          keyId: 0,
          publicKey: Buffer.from(randomBytes(32)).toString('base64'),
          signature: Buffer.from(randomBytes(64)).toString('base64'),
        },
      };

      res.status(200).json({
        success: true,
        room: {
          roomId: room.roomId,
          expiresAt: room.expiresAt,
          settings: room.settings,
        },
        signalProtocol,
      });
    } catch (error) {
      console.error('Error joining chat room:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to join chat room',
      });
    }
  }

  // Get room information
  async getRoomInfo(req, res) {
    try {
      const { roomId } = req.params;

      const room = await store.getRoom(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Chat room not found',
        });
      }

      if (new Date() > room.expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'Chat room has expired',
        });
      }

      res.status(200).json({
        success: true,
        room: {
          roomId: room.roomId,
          expiresAt: room.expiresAt,
          settings: room.settings,
          participantCount: room.participants.length,
        },
      });
    } catch (error) {
      console.error('Error getting room info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get room information',
      });
    }
  }

  // Delete a chat room
  async deleteRoom(req, res) {
    try {
      const { roomId } = req.params;
      const { password } = req.body;

      const room = await store.getRoom(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Chat room not found',
        });
      }

      const isValidPassword = await store.verifyPassword(roomId, password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password',
        });
      }

      await store.deleteRoom(roomId);

      res.status(200).json({
        success: true,
        message: 'Chat room deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting chat room:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete chat room',
      });
    }
  }
}

module.exports = new ChatRoomController(); 