// controllers/messageBotController.js
const Message = require('../models/Message');
const DirectMessage = require('../models/DirectMessage');

exports.saveBotMessage = async (messageData, type) => {
    console.log('💾 Tentative de sauvegarde message bot:', { ...messageData, type });

    try {
        let saved;

        if (type === 'channel') {
            // Messages de channel
            saved = await new Message({
                content: messageData.content,
                channel: messageData.channel,
                type: messageData.question && messageData.options ? 'poll' : 'bot',
                question: messageData.question || null,
                options: messageData.options || [],
                votes: messageData.votes || []
            }).save();



        } else if (type === 'dm') {
            // Messages directs
            const botId = '000000000000000000000000'; // ID factice pour le bot

            saved = await new DirectMessage({
                content: messageData.content,
                sender: botId,
                receiver: messageData.receiver,
                type: 'bot' // Identifiant de type bot
            }).save();
        }

        console.log('✅ Message bot sauvegardé:', saved?._id);
        return saved;
    } catch (error) {
        console.error('❌ Erreur sauvegarde message bot:', error);
        return null;
    }
};