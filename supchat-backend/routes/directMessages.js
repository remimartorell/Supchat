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
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const messages = await DirectMessage.find({
            $or: [
                { sender: req.user.id, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.user.id },
            ],
        })
            .populate('sender', 'name email')
            .populate('receiver', 'name email')
            .populate('readBy.user', 'name')
            .sort({ createdAt: 'asc' });

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route  POST /api/direct-messages/:messageId/reactions
// @desc   Ajouter/modifier une réaction sur un DM
// @access Privé
router.post('/:messageId/reactions', auth, async (req, res) => {
    const { emoji } = req.body;
    try {
        const dm = await DirectMessage.findById(req.params.messageId);
        if (!dm) {
            return res.status(404).json({ msg: 'DM not found' });
        }
        // Vérifier que l’utilisateur est sender ou receiver
        if (![dm.sender.toString(), dm.receiver.toString()].includes(req.user.id)) {
            return res.status(403).json({ msg: 'Not allowed (not participant)' });
        }
        // Ajouter ou mettre à jour la réaction
        const existingIdx = dm.reactions.findIndex(r => String(r.user) === req.user.id);
        if (existingIdx !== -1) {
            dm.reactions[existingIdx].emoji = emoji;
        } else {
            dm.reactions.push({ emoji, user: req.user.id });
        }
        await dm.save();
        // Peupler pour renvoyer user.name
        await dm.populate('reactions.user', 'name');

        // Émettre un event "dm-message-reacted" aux deux participants
        const io = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        const senderSock = userSocketMap[dm.sender.toString()];
        const receiverSock = userSocketMap[dm.receiver.toString()];
        const reactionObj = dm.reactions.find(r => String(r.user._id) === req.user.id);

        const payload = {
            dmId: dm._id.toString(),
            reaction: {
                ...reactionObj.toObject(), // { emoji, user: { _id, name }, ... }
            },
        };
        if (senderSock) io.to(senderSock).emit('dm-message-reacted', payload);
        if (receiverSock) io.to(receiverSock).emit('dm-message-reacted', payload);

        res.json(dm);
    } catch (err) {
        console.error(err);
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
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
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
                _id: message._id,   // <= AJOUT
                sender: req.user.id,
                receiver: receiverId,
                content: message.content,
                fileUrl: message.fileUrl,
                createdAt: message.createdAt
            });
        }

        // 2) Émettre au destinataire
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('new-private-message', {
                _id: message._id,   // <= AJOUT
                sender: req.user.id,
                receiver: receiverId,
                content: message.content,
                fileUrl: message.fileUrl,
                createdAt: message.createdAt
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

// 2) Nouveau routeur pour marquer un DM comme lu
router.put('/:messageId/markAsRead', auth, async (req, res) => {
    try {
        const messageId = req.params.messageId;
        let dm = await DirectMessage.findById(messageId);
        if (!dm) {
            return res.status(404).json({ msg: 'DM not found' });
        }

        // Vérif: Seules les personnes “sender” ou “receiver” ont le droit de le “lire”
        if (
            dm.sender.toString() !== req.user.id &&
            dm.receiver.toString() !== req.user.id
        ) {
            return res.status(403).json({ msg: 'Not allowed to read this DM' });
        }

        // 3) Mettre à jour readBy
        const already = dm.readBy.some((rb) => String(rb.user) === req.user.id);
        if (!already) {
            dm.readBy.push({ user: req.user.id, readAt: new Date() });
            await dm.save();
        }

        // 4) Emettre un event socket "dm-message-read"
        const io = req.app.get('socketio');
        // On veut envoyer un event en temps réel aux DEUX participants (sender et receiver).
        // Tu peux soit utiliser "rooms" spécifiques, soit cibler directement le socketId de l’autre.
        // Pour simplifier, on va faire un broadcast "dm-message-read" à la fois au sender et au receiver.
        const userSocketMap = req.app.get('userSocketMap');

        const senderSocketId = userSocketMap[dm.sender.toString()];
        const receiverSocketId = userSocketMap[dm.receiver.toString()];

        const payload = {
            dmId: messageId,
            userId: req.user.id,
        };

        if (senderSocketId) io.to(senderSocketId).emit('dm-message-read', payload);
        if (receiverSocketId) io.to(receiverSocketId).emit('dm-message-read', payload);

        return res.json({ msg: 'ok', dm });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route  PUT /api/direct-messages/:messageId
// @desc   Modifier le contenu d’un DM
// @access Privé (seulement l’auteur)
router.put('/:messageId', auth, async (req, res) => {
    const { newContent } = req.body;
    try {
        let dm = await DirectMessage.findById(req.params.messageId);
        if (!dm) {
            return res.status(404).json({ msg: 'DM not found' });
        }
        // Seul l’auteur peut éditer
        if (dm.sender.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Only the sender can edit this DM' });
        }
        dm.content = newContent;
        // Ajoutez un champ "edited" à votre modèle DirectMessage si vous voulez
        dm.edited = true;
        await dm.save();

        // Émettre un event "dm-message-updated"
        const io = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        const senderSock = userSocketMap[dm.sender.toString()];
        const receiverSock = userSocketMap[dm.receiver.toString()];

        const payload = {
            dmId: dm._id.toString(),
            newContent,
            edited: dm.edited,
        };
        if (senderSock)   io.to(senderSock).emit('dm-message-updated', payload);
        if (receiverSock) io.to(receiverSock).emit('dm-message-updated', payload);

        res.json({ msg: 'Message updated', dm });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;