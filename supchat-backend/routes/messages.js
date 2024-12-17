const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

// @route   POST /api/channels/:channelId/messages
// @desc    Envoyer un message dans un canal
// @access  Privé (membre du canal uniquement)
router.post('/:channelId/messages', auth, async (req, res) => {
    const { content } = req.body;

    try {
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) {
            return res.status(404).json({ msg: 'Channel not found' });
        }

        // Créer et sauvegarder le message
        const newMessage = new Message({
            content,
            channel: req.params.channelId,
            sender: req.user.id,
        });

        const message = await newMessage.save();
        res.json(message);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/channels/:channelId/messages
// @desc    Voir les messages d'un canal
// @access  Privé (membre du canal uniquement)
router.get('/:channelId/messages', auth, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) {
            return res.status(404).json({ msg: 'Channel not found' });
        }

        // Récupérer tous les messages du canal
        const messages = await Message.find({ channel: req.params.channelId })
            .populate('sender', 'name email') // Afficher le nom et l'email de l'auteur
            .sort({ createdAt: 'asc' }); // Trier par date croissante

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;