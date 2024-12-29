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
    content: {
        type: String,
    },
    fileUrl: {
        type: String,
    },
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
});

module.exports = mongoose.model('DirectMessage', DirectMessageSchema);
