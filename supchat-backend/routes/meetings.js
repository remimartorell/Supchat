// supchat-backend/routes/meetings.js
const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const { saveBotMessage } = require('../controllers/messageBotController');
const authMiddleware = require('../middleware/auth');

router.post('/create', authMiddleware, async (req, res) => {
    const { startTime, title, channel, receiver } = req.body;

    try {
        const meeting = new Meeting({
            startTime,
            title,
            channel: channel || null,
            receiver: receiver || null,
        });

        await meeting.save();

        const io = req.app.get('socketio');
        const saved = await saveBotMessage({
            content: `✅ Réunion "${title}" planifiée à ${new Date(startTime).toLocaleTimeString()}.`,
            channel: meeting.channel || null,
            receiver: meeting.receiver || null,
        }, meeting.channel ? 'channel' : 'dm');

        if (saved) {
            const payload = saved.toObject();
            if (meeting.channel) {
                io.to(meeting.channel.toString()).emit('bot-message', payload);
            } else if (meeting.receiver) {
                const userSocketMap = req.app.get('userSocketMap');
                const sockId = userSocketMap[meeting.receiver.toString()];
                if (sockId) io.to(sockId).emit('bot-message', payload);
            }
        }

        res.status(201).json({ message: 'Réunion créée avec succès', meeting });
    } catch (err) {
        console.error('Erreur création réunion :', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
