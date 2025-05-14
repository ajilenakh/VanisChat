const bcrypt = require('bcryptjs');

class InMemoryStore {
  constructor() {
    this.rooms = new Map();
  }

  async createRoom(roomData) {
    const { roomId, password, creator, expiresAt, settings } = roomData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const room = {
      roomId,
      password: hashedPassword,
      creator,
      createdAt: new Date(),
      expiresAt: new Date(expiresAt),
      isActive: true,
      participants: [],
      settings,
    };

    this.rooms.set(roomId, room);
    return room;
  }

  async getRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Check if room has expired
    if (new Date() > room.expiresAt) {
      this.rooms.delete(roomId);
      return null;
    }

    return room;
  }

  async verifyPassword(roomId, password) {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    return bcrypt.compare(password, room.password);
  }

  async addParticipant(roomId, participant) {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    room.participants.push({
      socketId: participant.socketId,
      name: participant.name,
      joinedAt: new Date(),
    });

    return true;
  }

  async removeParticipant(roomId, socketId) {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    room.participants = room.participants.filter(p => p.socketId !== socketId);
    return true;
  }

  async deleteRoom(roomId) {
    return this.rooms.delete(roomId);
  }

  // Cleanup expired rooms
  cleanup() {
    const now = new Date();
    for (const [roomId, room] of this.rooms.entries()) {
      if (now > room.expiresAt) {
        this.rooms.delete(roomId);
      }
    }
  }
}

// Create a singleton instance
const store = new InMemoryStore();

// Run cleanup every minute
setInterval(() => store.cleanup(), 60000);

module.exports = store; 