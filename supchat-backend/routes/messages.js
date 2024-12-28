const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const multer = require('multer');
const path = require('path');

// Configuration de Multer pour stocker les fichiers localement
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Dossier où les fichiers seront stockés
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + '-' + file.originalname); // Nom unique pour chaque fichier
    },
});

const upload = multer({ storage });

// @route   POST /api/channels/:channelId/messages
// @desc    Envoyer un message avec texte ou fichier
// @access  Privé (membre du canal uniquement)
router.post('/:channelId/messages', auth, upload.single('file'), async (req, res) => {
    const { content } = req.body;

    try {
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) {
            return res.status(404).json({ msg: 'Channel not found' });
        }

        // Créer et sauvegarder le message
        const newMessage = new Message({
            content,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
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

// @route   POST /api/channels/:channelId/messages/:messageId/reactions
// @desc    Ajouter une réaction (emoji) à un message
// @access  Privé (membre uniquement)
router.post('/:channelId/messages/:messageId/reactions', auth, async (req, res) => {
    const { emoji } = req.body;

    try {
        const message = await Message.findById(req.params.messageId);
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

module.exports = router;