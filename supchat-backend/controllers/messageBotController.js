// controllers/messageBotController.js
const mongoose = require('mongoose');
const Message = require('../models/Message');
const DirectMessage = require('../models/DirectMessage');

// IDs fixes pour chaque bot
const BOT_REMINDER_ID = new mongoose.Types.ObjectId('6819c4fc028224b0bb44dd37');
const BOT_POLL_ID = new mongoose.Types.ObjectId('6819c534028224b0bb44dd3c');
const BOT_MEETING_ID = new mongoose.Types.ObjectId('6819c59b028224b0bb44dd43');

// Mapping des avatars et noms
const BOT_INFO = {
    reminder: {
        _id: BOT_REMINDER_ID,
        name: 'RappelBot',
        avatar: '/img/reminder-avatar.png'
    },
    poll: {
        _id: BOT_POLL_ID,
        name: 'SondageBot',
        avatar: '/img/poll-avatar.png'
    },
    meeting: {
        _id: BOT_MEETING_ID,
        name: 'RéunionBot',
        avatar: '/img/meeting-avatar.png'
    }
};

exports.saveBotMessage = async (messageData, type) => {
    console.log('💾 Tentative de sauvegarde message bot:', { ...messageData, type });

    try {
        let saved;
        const botType = messageData.botType || 'reminder'; // défaut = reminder
        const bot = BOT_INFO[botType];

        if (!bot) {
            throw new Error(`Bot type inconnu : ${botType}`);
        }

        if (type === 'channel') {
            // Message dans un channel
            saved = await new Message({
                content: messageData.content,
                channel: messageData.channel,
                type: messageData.question && messageData.options ? 'poll' : 'bot',
                question: messageData.question || null,
                options: messageData.options || [],
                votes: messageData.votes || [],
                sender: bot._id
            }).save();

        } else if (type === 'dm') {
            // Message direct
            saved = await new DirectMessage({
                content: messageData.content,
                sender: bot._id,
                receiver: messageData.receiver,
                type: 'bot'
            }).save();
        }

        console.log('✅ Message bot sauvegardé:', saved?._id);
        return saved;
    } catch (error) {
        console.error('❌ Erreur sauvegarde message bot:', error);
        return null;
    }
};
