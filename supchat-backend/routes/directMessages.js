const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Configuration de Multer pour stocker les fichiers
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

const upload = multer({ storage });

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

// @route   POST /api/direct-messages/:messageId/reactions
// @desc    Ajouter une réaction (emoji) à un message privé
// @access  Privé
router.post('/:messageId/reactions', auth, async (req, res) => {
    const { emoji } = req.body;

    try {
        const message = await DirectMessage.findById(req.params.messageId);
        if (!message) {
            return res.status(404).json({ msg: 'Message not found' });
        }

        // Ajouter une réaction
        message.reactions.push({ emoji, user: req.user.id });
        await message.save();

        res.json(message);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/direct-messages
// @desc    Envoyer un message privé avec ou sans fichier
// @access  Privé
router.post('/', auth, upload.single('file'), async (req, res) => {
    const { content, receiverId } = req.body;

    try {
        const receiver = await User.findById(receiverId?.trim());
        if (!receiver) {
            return res.status(404).json({ msg: 'Receiver not found' });
        }

        const newMessage = new DirectMessage({
            sender: req.user.id,
            receiver: receiverId,
            content,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
        });

        const message = await newMessage.save();
        res.json(message);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
