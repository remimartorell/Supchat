// supchat-backend/models/Message.js

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    content: {
        type: String,
    },
    fileUrl: {
        type: String,
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    deliveredAt: { type: Date }, // Date de délivrance
    readBy: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            readAt: { type: Date }
        }
    ],
    reactions: [
        {
            emoji: { type: String },
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    edited: {
        type: Boolean,
        default: false,
    },
});

module.exports = mongoose.model('Message', MessageSchema);
