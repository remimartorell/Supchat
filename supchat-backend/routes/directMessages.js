const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');

// @route   POST /api/direct-messages
// @desc    Envoyer un message privé
// @access  Privé
router.post('/', auth, async (req, res) => {
    const { receiverId, content } = req.body;

    try {
        // Vérifier que le destinataire existe
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ msg: 'Receiver not found' });
        }

        // Créer et sauvegarder le message privé
        const newMessage = new DirectMessage({
            sender: req.user.id,
            receiver: receiverId,
            content,
        });

        const message = await newMessage.save();
        res.json(message);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/direct-messages/:userId
// @desc    Voir les messages échangés avec un utilisateur
// @access  Privé
router.get('/:userId', auth, async (req, res) => {
    try {
        // Vérifier que l'utilisateur avec qui on veut voir les messages existe
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Récupérer les messages échangés entre l'utilisateur connecté et l'autre utilisateur
        const messages = await DirectMessage.find({
            $or: [
                { sender: req.user.id, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.user.id },
            ],
        }).sort({ createdAt: 'asc' });

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
