const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Notification = require('../models/Notification');

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

        // On crée et sauvegarde le message
        const newMessage = new Message({
            content: req.body.content,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
            channel: req.params.channelId,
            sender: req.user.id,
        });

        const mentions = JSON.parse(req.body.mentions || '[]');
        for (const mentionName of mentions) {
            const userMentioned = await User.findOne({ username: mentionName });
            if (userMentioned) {
                // Creer la notification
                await Notification.create({
                    user: userMentioned._id,
                    type: 'mention',
                    channel: req.params.channelId,
                    message: `${req.user.id} t'a mentionné dans le channel ${req.params.channelId}`
                });

                // Émettre un event mention-notification
                const userSocketId = userSocketMap[userMentioned._id];
                if (userSocketId) {
                    io.to(userSocketId).emit('mention-notification', {
                        from: req.user.id,
                        channelId: req.params.channelId,
                        message: 'bla bla mention...'
                    });
                }
            }
        }

        const message = await newMessage.save();

        // -- Émettre l'event via Socket.IO
        const io = req.app.get('socketio');
        // Optionnel : si tu veux peupler le sender en code, ex. :
        //   const user = await User.findById(req.user.id).select('name email');
        //   (mais sinon on envoie juste l'ID)

        const userSocketMap = req.app.get('userSocketMap');

        io.to(req.params.channelId).emit('new-channel-message', {
            _id: message._id,
            content: message.content,
            channelId: req.params.channelId,
            sender: req.user.id, // ou { _id: user._id, name: user.name }
            createdAt: message.createdAt,
            fileUrl: message.fileUrl,
        });

        // L’expéditeur (req.user.id) => on récupère son socketId
        const senderSocketId = userSocketMap[req.user.id];
        if (senderSocketId) {
            io.to(senderSocketId).emit('new-channel-message', {
                _id: message._id,
                content: message.content,
                channelId: req.params.channelId,
                sender: req.user.id, // ou { _id: user._id, name: user.name }
                createdAt: message.createdAt,
                fileUrl: message.fileUrl,
            });
        }

        return res.json(message);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
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