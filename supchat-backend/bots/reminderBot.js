// supchat-backend/bots/reminderBot.js

module.exports = function initReminderBot(io) {
    io.on('connection', (socket) => {
        socket.on('remindme', ({ time, message }) => {
            console.log(`⏰ /remindme reçu via reminderBot.js :`, { time, message });

            // Envoie immédiat d’un message bot
            io.emit('bot-message', {
                type: 'bot',
                content: `⏰ Rappel programmé : "${message}" dans ${time}`,
                time,
                message,
            });

            // Optionnel : simule un rappel après délai
            // (non fiable à long terme, mais utile pour dev)
            const delayMs = convertToMs(time);
            if (delayMs) {
                setTimeout(() => {
                    io.emit('bot-message', {
                        type: 'bot',
                        content: `🔔 Rappel : ${message} (après ${time})`,
                    });
                }, delayMs);
            }
        });
    });
};

// Petit convertisseur simple "10min" => millisecondes
function convertToMs(input) {
    const regex = /^(\d+)(s|min|h)$/;
    const match = input.match(regex);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'min': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        default: return null;
    }
}
