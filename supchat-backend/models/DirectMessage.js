// supchat-backend/models/DirectMessage.js
const mongoose = require('mongoose');

const DirectMessageSchema = new mongoose.Schema({
    content: {
        type: String,
    },
    fileUrl: {
        type: String,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    // ← AJOUT type de message
    type: {
        type: String,
        enum: ['normal', 'bot'],
        default: 'normal'
    },

    deliveredAt: {
        type: Date,
    },
    readBy: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            readAt: { type: Date },
        }
    ],
    reactions: [
        {
            emoji: { type: String },
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        }
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

// On évite OverwriteModelError
module.exports = mongoose.models.DirectMessage
    ? mongoose.model('DirectMessage')
    : mongoose.model('DirectMessage', DirectMessageSchema);
