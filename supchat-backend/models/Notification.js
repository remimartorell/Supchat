// supchat-backend/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
    message: { type: String },
    messageId: { type: mongoose.Schema.Types.ObjectId }, // Pour naviguer vers un message précis
    read: { type: Boolean, default: false },             // Pour suivre l'état de lecture
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', NotificationSchema);

