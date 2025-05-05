// supchat-backend/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true  // ex: 'mention', 'reaction', 'reminder', etc.
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        default: null
    },
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null  // pour pointer vers le message concerné, si besoin
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// On évite l’erreur OverwriteModelError en ne déclarant le modèle qu’une seule fois
module.exports = mongoose.models.Notification
    || mongoose.model('Notification', NotificationSchema);
