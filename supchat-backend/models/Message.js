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
        default: null
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // ← CHAMPS POUR SONDAGES
    question: {
        type: String,
        default: null
    },
    options: {
        type: [String],
        default: undefined
    },
    votes: {
        type: [Number],
        default: undefined
    },
    // ← FIN champs sondages

    // ← AJOUT type de message
    type: {
        type: String,
        enum: ['normal', 'bot', 'poll'],
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
module.exports = mongoose.models.Message
    ? mongoose.model('Message')
    : mongoose.model('Message', MessageSchema);
