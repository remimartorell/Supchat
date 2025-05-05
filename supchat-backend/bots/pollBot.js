// bots/pollBot.js
const { saveBotMessage } = require('../controllers/messageBotController');
const Message = require('../models/Message');

module.exports = function initPollBot(io, activePolls, userSocketMap) {
    io.on('connection', socket => {
        socket.on('poll', async data => {
            const { question, options, channelId, receiverId } = data;

            // Validation basique
            if (!question || !Array.isArray(options) || options.length < 2 || options.length > 4) {
                console.warn('❌ Sondage refusé : mauvais format');
                return;
            }

            // Générer un ID unique et initialiser les votes
            const pollId = Date.now().toString();
            const votes = Array(options.length).fill(0);
            activePolls.set(pollId, { question, options, votes });

            // Sauvegarder le message bot en base
            const saved = await saveBotMessage({
                content: `📊 Sondage : ${question}`,
                channel: channelId || null,
                receiver: receiverId || null,
                question,
                options,
                votes
            }, channelId ? 'channel' : 'dm');


            if (!saved) return;

            // Préparer le payload à envoyer aux clients
            const payload = {
                _id:        saved._id.toString(),
                question,
                options,
                votes,
                createdAt:  saved.createdAt,
                sender:     '000000000000000000000000',
                channel:    channelId || null,
                receiver:   receiverId || null,
                isBot:      true,
                type:       'poll'
            };


            // Émettre dans le channel ou en DM
            if (channelId) {
                io.to(channelId).emit('bot-message', payload);
            } else if (receiverId) {
                const sockId = userSocketMap[receiverId];
                if (sockId) io.to(sockId).emit('bot-message', payload);
            }
        });

        socket.on('vote-poll', async ({ pollId, optionIndex }) => {
            try {
                const pollMsg = await Message.findById(pollId);
                if (!pollMsg || !Array.isArray(pollMsg.votes) || !pollMsg.options?.length) return;
                if (optionIndex < 0 || optionIndex >= pollMsg.options.length) return;

                pollMsg.votes[optionIndex]++;
                await pollMsg.save();

                io.emit('poll-result', {
                    _id: pollMsg._id.toString(),
                    question: pollMsg.question,
                    options: pollMsg.options,
                    votes: pollMsg.votes
                });
            } catch (err) {
                console.error('❌ Erreur lors du vote :', err);
            }
        });
    });

    console.log('✅ Bot de sondage initialisé.');
};
