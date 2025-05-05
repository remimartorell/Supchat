// bots/pollBot.js
const { saveBotMessage } = require('../controllers/messageBotController');

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
                channel: channelId  || null,
                receiver: receiverId || null
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

        socket.on('vote-poll', ({ pollId, optionIndex }) => {
            const poll = activePolls.get(pollId);
            if (!poll) return;
            if (optionIndex < 0 || optionIndex >= poll.options.length) return;

            // Incrémenter le vote
            poll.votes[optionIndex]++;
            activePolls.set(pollId, poll);

            // Diffuser les nouveaux résultats
            io.emit('poll-result', {
                _id:      pollId,
                question: poll.question,
                options:  poll.options,
                votes:    poll.votes,
            });
        });
    });

    console.log('✅ Bot de sondage initialisé.');
};
