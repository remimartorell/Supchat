const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fromUser: {                          // <- obligatoire pour savoir qui mentionne
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true   // ex: 'mention', 'reaction', etc.
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        default: null
    },
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    message: {                          // <- le texte à afficher dans la cloche
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true   // créé createdAt & updatedAt automatiquement
});

// Évite l’erreur OverwriteModelError
module.exports = mongoose.models.Notification
    || mongoose.model('Notification', NotificationSchema);
