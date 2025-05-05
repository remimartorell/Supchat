// supchat-backend/bots/meetingBot.js
const cron = require('node-cron');
const Meeting = require('../models/Meeting');
const { saveBotMessage } = require('../controllers/messageBotController');

const initMeetingBot = (io, userSocketMap) => {
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const inThirtyMin = new Date(now.getTime() + 30 * 60 * 1000);
        const inOneMin = new Date(now.getTime() + 60 * 1000);

        try {
            const meetings = await Meeting.find({
                startTime: { $gte: now, $lte: inOneMin },
            });

            const soonMeetings = await Meeting.find({
                startTime: { $gte: now, $lte: inThirtyMin },
            });

            for (const meeting of soonMeetings) {
                const diff = (new Date(meeting.startTime) - now) / 60000;
                if (Math.abs(diff - 30) < 1) { // ≈30 minutes
                    const saved = await saveBotMessage({
                        content: `⏰ Rappel : La réunion "${meeting.title}" commence dans 30 minutes (${meeting.startTime.toLocaleTimeString()}).`,
                        channel: meeting.channel || null,
                        receiver: meeting.receiver || null,
                    }, meeting.channel ? 'channel' : 'dm');

                    if (saved) {
                        const payload = saved.toObject();
                        if (meeting.channel) {
                            io.to(meeting.channel.toString()).emit('bot-message', payload);
                        } else if (meeting.receiver) {
                            const sockId = userSocketMap[meeting.receiver.toString()];
                            if (sockId) io.to(sockId).emit('bot-message', payload);
                        }
                    }
                }
            }

            for (const meeting of meetings) {
                const saved = await saveBotMessage({
                    content: `📅 Rappel immédiat : La réunion "${meeting.title}" commence à ${meeting.startTime.toLocaleTimeString()}.`,
                    channel: meeting.channel || null,
                    receiver: meeting.receiver || null,
                }, meeting.channel ? 'channel' : 'dm');

                if (saved) {
                    const payload = saved.toObject();
                    if (meeting.channel) {
                        io.to(meeting.channel.toString()).emit('bot-message', payload);
                    } else if (meeting.receiver) {
                        const sockId = userSocketMap[meeting.receiver.toString()];
                        if (sockId) io.to(sockId).emit('bot-message', payload);
                    }
                }
            }
        } catch (err) {
            console.error('Erreur lors de la vérification des réunions :', err);
        }
    });

    console.log('✅ Bot de réunion initialisé.');
};

module.exports = initMeetingBot;
