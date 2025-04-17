const cron = require('node-cron');
const Meeting = require('../models/Meeting');

const initMeetingBot = (io) => {
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const inOneMinute = new Date(now.getTime() + 60 * 1000);

        try {
            const meetings = await Meeting.find({
                startTime: { $gte: now, $lte: inOneMinute },
            });

            meetings.forEach((meeting) => {
                const reminderMessage = {
                    _id: 'bot_' + Date.now(),
                    sender: 'bot',
                    content: `📅 Rappel : La réunion "${meeting.title}" commence à ${meeting.startTime.toLocaleTimeString()}.`,
                    createdAt: new Date(),
                    isBot: true
                };

                io.emit('bot-message', reminderMessage);
            });
        } catch (err) {
            console.error('Erreur lors de la vérification des réunions :', err);
        }
    });

    console.log('✅ Bot de réunion initialisé.');
};

module.exports = initMeetingBot;
