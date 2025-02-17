// supchat-backend/models/DirectMessage.js
const mongoose = require('mongoose');

const DirectMessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: { type: String },
    fileUrl: { type: String },
    reactions: [
        {
            emoji: { type: String },
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
    ],
    readBy: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            readAt: { type: Date },
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    edited: {
        type: Boolean,
        default: false
    },
});

module.exports = mongoose.model('DirectMessage', DirectMessageSchema);