// supchat-backend/routes/directMessages.js
const express       = require('express');
const router        = express.Router();
const auth          = require('../middleware/auth');
const DirectMessage = require('../models/DirectMessage');
const Notification  = require('../models/Notification');   // ← ajouté
const User          = require('../models/User');
const multer        = require('multer');

// Configuration Multer (inchangée)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

/**
 * GET /api/direct-messages/:userId
 * Récupère l’historique des DM avec un autre utilisateur
 */
router.get('/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const messages = await DirectMessage.find({
            $or: [
                { sender:   req.user.id, receiver: req.params.userId },
                { sender:   req.params.userId, receiver: req.user.id },
                { sender:   '000000000000000000000000', receiver: req.user.id }
            ],
        })
            .populate('sender',   'name email avatarFileId')
            .populate('receiver', 'name email avatarFileId')
            .populate('readBy.user', 'name')
            .sort({ createdAt: 'asc' });

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * POST /api/direct-messages/:messageId/reactions
 * Ajouter / modifier une réaction sur un DM
 */
router.post('/:messageId/reactions', auth, async (req, res) => {
    const { emoji } = req.body;
    try {
        const dm = await DirectMessage.findById(req.params.messageId);
        if (!dm) return res.status(404).json({ msg: 'DM not found' });

        if (![dm.sender.toString(), dm.receiver.toString()].includes(req.user.id)) {
            return res.status(403).json({ msg: 'Not allowed (not participant)' });
        }

        const idx = dm.reactions.findIndex(r => String(r.user) === req.user.id);
        if (idx !== -1) dm.reactions[idx].emoji = emoji;
        else            dm.reactions.push({ emoji, user: req.user.id });

        await dm.save();
        await dm.populate('reactions.user', 'name');

        // Émission socket aux deux participants
        const io            = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        const reactionObj   = dm.reactions.find(r => String(r.user._id) === req.user.id);
        const payload = {
            dmId: dm._id.toString(),
            reaction: reactionObj.toObject()
        };

        const senderSock   = userSocketMap[dm.sender.toString()];
        const receiverSock = userSocketMap[dm.receiver.toString()];
        if (senderSock)   io.to(senderSock).emit('dm-message-reacted', payload);
        if (receiverSock) io.to(receiverSock).emit('dm-message-reacted', payload);

        res.json(dm);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

/**
 * POST /api/direct-messages
 * Envoie un message privé, gère les mentions et crée/émet les notifications
 */
router.post('/', auth, upload.single('file'), async (req, res) => {
    // on attend désormais un champ "mentions" JSON.stringify([...usernames])
    const { content, receiverId, mentions } = req.body;
    const mentionsList = JSON.parse(mentions || '[]');

    try {
        const receiver = await User.findById(receiverId?.trim());
        if (!receiver) {
            return res.status(404).json({ msg: 'Receiver not found' });
        }

        // 1️⃣ Création et sauvegarde du DM
        const newMessage = new DirectMessage({
            sender:   req.user.id,
            receiver: receiverId,
            content,
            fileUrl:  req.file ? `/uploads/${req.file.filename}` : null,
        });
        const message = await newMessage.save();

        // 2️⃣ Emission du DM vers l’expéditeur et le destinataire
        const io            = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        const senderSock    = userSocketMap[req.user.id];
        const receiverSock  = userSocketMap[receiverId];

        const payload = {
            _id:       message._id,
            sender:    req.user.id,
            receiver:  receiverId,
            content:   message.content,
            fileUrl:   message.fileUrl,
            createdAt: message.createdAt
        };
        if (senderSock)   io.to(senderSock).emit('new-private-message', payload);
        if (receiverSock) {
            io.to(receiverSock).emit('new-private-message', payload);
            console.log(`Message privé émis à ${receiverId} via socket ${receiverSock}`);
        }

        // 3️⃣ Pour chaque @mention, on crée une Notification et on l’émet
        for (const username of mentionsList) {
            const userMentioned = await User.findOne({ username });
            if (!userMentioned) continue;

            // Création de la notification
            let notif = new Notification({
                user:      userMentioned._id,
                fromUser:  req.user.id,
                type:      'mention',
                channel:   null,
                messageId: message._id
            });
            await notif.save();

            // Repopulate pour récupérer fromUser.username
            notif = await Notification
                .findById(notif._id)
                .populate('fromUser', 'username');

            // Émission de la notification
            const sockId = userSocketMap[userMentioned._id.toString()];
            if (sockId) io.to(sockId).emit('new-notification', notif);
        }

        return res.json(message);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

/**
 * PUT /api/direct-messages/:messageId/markAsRead
 * Marquer un DM comme lu et émettre l’événement "dm-message-read"
 */
router.put('/:messageId/markAsRead', auth, async (req, res) => {
    try {
        const dm = await DirectMessage.findById(req.params.messageId);
        if (!dm) return res.status(404).json({ msg: 'DM not found' });

        if (String(dm.sender) !== req.user.id && String(dm.receiver) !== req.user.id) {
            return res.status(403).json({ msg: 'Not allowed to read this DM' });
        }

        const already = dm.readBy.some(rb => String(rb.user) === req.user.id);
        if (!already) {
            dm.readBy.push({ user: req.user.id, readAt: new Date() });
            await dm.save();
        }

        // Émettre update real-time
        const io            = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        const payload = { dmId: req.params.messageId, userId: req.user.id };

        const sockSender   = userSocketMap[dm.sender.toString()];
        const sockReceiver = userSocketMap[dm.receiver.toString()];
        if (sockSender)   io.to(sockSender).emit('dm-message-read', payload);
        if (sockReceiver) io.to(sockReceiver).emit('dm-message-read', payload);

        return res.json({ msg: 'ok', dm });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

/**
 * PUT /api/direct-messages/:messageId
 * Modifier le contenu d’un DM (seulement l’auteur)
 */
router.put('/:messageId', auth, async (req, res) => {
    const { newContent } = req.body;
    try {
        let dm = await DirectMessage.findById(req.params.messageId);
        if (!dm) return res.status(404).json({ msg: 'DM not found' });
        if (dm.sender.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Only the sender can edit this DM' });
        }

        dm.content = newContent;
        dm.edited  = true;
        await dm.save();

        // Émettre l’update
        const io            = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        const payload = {
            dmId:       dm._id.toString(),
            newContent: dm.content,
            edited:     dm.edited
        };

        const sockSender   = userSocketMap[dm.sender.toString()];
        const sockReceiver = userSocketMap[dm.receiver.toString()];
        if (sockSender)   io.to(sockSender).emit('dm-message-updated', payload);
        if (sockReceiver) io.to(sockReceiver).emit('dm-message-updated', payload);

        return res.json({ msg: 'Message updated', dm });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
