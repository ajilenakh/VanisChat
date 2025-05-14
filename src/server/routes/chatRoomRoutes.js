const express = require('express');
const router = express.Router();
const chatRoomController = require('../controllers/chatRoomController');

// Create a new chat room
router.post('/create', chatRoomController.createRoom);

// Join an existing chat room
router.post('/join', chatRoomController.joinRoom);

// Get room information
router.get('/:roomId', chatRoomController.getRoomInfo);

// Delete a chat room
router.delete('/:roomId', chatRoomController.deleteRoom);

module.exports = router; 