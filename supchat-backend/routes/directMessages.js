const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const multer = require('multer');

// Configuration Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
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
// @desc    Envoyer un message privé
// @access  Privé
router.post('/', auth, upload.single('file'), async (req, res) => {
    const { content, receiverId } = req.body;

    try {
        const receiver = await User.findById(receiverId?.trim());
        if (!receiver) {
            return res.status(404).json({ msg: 'Receiver not found' });
        }

        // Création + sauvegarde
        const newMessage = new DirectMessage({
            sender: req.user.id,
            receiver: receiverId,
            content,
            fileUrl: req.file ? `http://localhost:3000/uploads/${req.file.filename}` : null,
        });
        const message = await newMessage.save();

        // Socket.IO
        const io = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');

        // SocketId du destinataire
        const receiverSocketId = userSocketMap[receiverId];
        // SocketId de l'expéditeur
        const senderSocketId = userSocketMap[req.user.id];

        // 1) Émettre à l’expéditeur
        if (senderSocketId) {
            io.to(senderSocketId).emit('new-private-message', {
                sender: req.user.id,
                receiver: receiverId,
                content: message.content,
                fileUrl: message.fileUrl,
                createdAt: message.createdAt,
            });
        }

        // 2) Émettre au destinataire
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('new-private-message', {
                sender: req.user.id,
                receiver: receiverId,
                content: message.content,
                fileUrl: message.fileUrl,
                createdAt: message.createdAt,
            });
            console.log(`Message privé émis au destinataire socketId : ${receiverSocketId}`);
        } else {
            console.log('Le destinataire n’est pas connecté ou pas "join"');
        }

        // On renvoie le message sauvegardé
        return res.json(message);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
