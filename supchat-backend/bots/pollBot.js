// bots/pollBot.js

module.exports = function initPollBot(io, activePolls) {
    io.on('connection', (socket) => {
        socket.on('poll', (data) => {
            const { question, options } = data;

            if (!question || !Array.isArray(options) || options.length < 2 || options.length > 4) {
                console.warn('❌ Sondage refusé : mauvais format');
                return;
            }

            const pollId = Date.now().toString();
            const votes = Array(options.length).fill(0);

            // Sauvegarde en mémoire
            activePolls.set(pollId, { question, options, votes });

            // Émission du message bot initial
            io.emit('bot-message', {
                _id: pollId,
                type: 'bot',
                sender: { name: 'bot', avatar: '/img/bot-avatar.png' },
                question,
                options,
                votes,
                createdAt: new Date(),
            });
        });

        socket.on('vote-poll', ({ pollId, optionIndex }) => {
            const poll = activePolls.get(pollId);
            if (!poll) return;

            if (optionIndex < 0 || optionIndex >= poll.options.length) return;

            poll.votes[optionIndex]++;
            activePolls.set(pollId, poll);

            io.emit('poll-result', {
                _id: pollId,
                question: poll.question,
                options: poll.options,
                votes: poll.votes,
            });
        });
    });

    console.log('✅ Bot de sondage initialisé.');
};
