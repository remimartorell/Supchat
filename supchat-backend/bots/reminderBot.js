// supchat-backend/bots/reminderBot.js
const { saveBotMessage } = require('../controllers/messageBotController');

module.exports = function initReminderBot(io, userSocketMap) {
    io.on('connection', (socket) => {
        socket.on('remindme', async ({ time, message, channelId, receiverId }) => {
            console.log('⏰ /remindme reçu via reminderBot.js :', { time, message, channelId, receiverId });

            const isDM = Boolean(receiverId);

            // 1) Confirmation programmée (persistée)
            const saved = await saveBotMessage(
                {
                    content: `⏰ Rappel programmé : "${message}" dans ${time}`,
                    channel:  channelId,
                    receiver: receiverId,
                },
                isDM ? 'dm' : 'channel'
            );

            if (saved) {
                const payload = saved.toObject();
                // émettre uniquement à l’utilisateur concerné ou à la salle
                if (isDM) {
                    const sockId = userSocketMap[receiverId];
                    if (sockId) io.to(sockId).emit('bot-message', payload);
                } else {
                    io.to(channelId).emit('bot-message', payload);
                }
            }

            // 2) Envoi réel après délai
            const delayMs = convertToMs(time);
            if (!delayMs) return;

            setTimeout(async () => {
                const finalSaved = await saveBotMessage({
                    content: `🔔 Rappel : ${message} (après ${time})`,
                    channel: channelId || null,
                    receiver: receiverId || null,
                }, isDM ? 'dm' : 'channel');

                if (finalSaved) {
                    const payload = finalSaved.toObject();
                    if (channelId) {
                        io.to(channelId).emit('bot-message', payload);
                    }
                    else if (receiverId) {
                        const sockId = userSocketMap[receiverId];
                        if (sockId) io.to(sockId).emit('bot-message', payload);
                    }
                }
            }, delayMs);
        });
    });
};

function convertToMs(input) {
    const regex = /^(\d+)(s|min|h)$/;
    const m = input.match(regex);
    if (!m) return null;
    const v = parseInt(m[1], 10);
    switch (m[2]) {
        case 's':   return v * 1000;
        case 'min': return v * 60 * 1000;
        case 'h':   return v * 60 * 60 * 1000;
        default:    return null;
    }
}
