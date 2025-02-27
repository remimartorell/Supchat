// supchat-backend/models/Channel.js
const mongoose = require('mongoose');

const ChannelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true,
    },
    type: {
        type: String,
        enum: ['public', 'private'],
        default: 'public',
    },
    members: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Channel', ChannelSchema);
