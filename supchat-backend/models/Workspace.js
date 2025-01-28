// supchat-backend/models/Workspace.js
const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    members: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            role: {
                type: String,
                enum: ['owner', 'admin', 'moderator', 'member'],
                default: 'member'
            }
        }
    ],

    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Workspace', WorkspaceSchema);