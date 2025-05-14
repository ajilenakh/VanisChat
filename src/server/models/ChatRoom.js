const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const chatRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  creator: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: process.env.MAX_ROOM_DURATION, // Auto-delete after MAX_ROOM_DURATION seconds
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  participants: [{
    socketId: String,
    name: String,
    joinedAt: Date,
  }],
  settings: {
    allowFileSharing: {
      type: Boolean,
      default: true,
    },
    maxFileSize: {
      type: Number,
      default: process.env.MAX_FILE_SIZE,
    },
    allowedFileTypes: {
      type: [String],
      default: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
    },
  },
});

// Hash password before saving
chatRoomSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
chatRoomSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to add participant
chatRoomSchema.methods.addParticipant = function(socketId, name) {
  this.participants.push({
    socketId,
    name,
    joinedAt: new Date(),
  });
  return this.save();
};

// Method to remove participant
chatRoomSchema.methods.removeParticipant = function(socketId) {
  this.participants = this.participants.filter(p => p.socketId !== socketId);
  return this.save();
};

// Method to check if room is expired
chatRoomSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

module.exports = ChatRoom; 