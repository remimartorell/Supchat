const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Workspace = require('../models/Workspace');

// Configuration de Multer pour stocker les fichiers localement
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) =>
        cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// ----------------------
// POST /api/channels/:channelId/messages
// Envoi d’un message (texte, fichier, mentions)
// ----------------------
router.post('/:channelId/messages', auth, upload.single('file'), async (req, res) => {
    const { content } = req.body;
    try {
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) return res.status(404).json({ msg: 'Channel not found' });

        const workspace = await Workspace.findById(channel.workspace);
        if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });
        if (!workspace.members.some(m => m.user.toString() === req.user.id))
            return res.status(403).json({ msg: 'Access denied (not in workspace)' });

        if (channel.type === 'private' &&
            !channel.members.some(u => u.toString() === req.user.id)) {
            return res.status(403).json({ msg: 'Access denied to private channel' });
        }

        const newMessage = new Message({
            content,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
            channel: req.params.channelId,
            sender:  req.user.id
        });
        const message = await newMessage.save();

        const io = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        const mentions = JSON.parse(req.body.mentions || '[]');
        const validMentions = [];
        const fromUser = await User.findById(req.user.id).select('name username');

        for (const mentionName of mentions) {
            const userMentioned = await User.findOne({ name: mentionName });
            if (!userMentioned) continue;
            validMentions.push(mentionName);

            // Création d'une SEULE notification AVEC fromUser (champ requis)
            const notif = await Notification.create({
                user:      userMentioned._id,
                fromUser:  req.user.id,
                type:      'mention',
                channel:   channel._id,
                message:   `${fromUser.name} t'a mentionné dans le channel ${channel.name}`,
                messageId: message._id
            });

            // Populate fromUser pour l'envoi via socket
            const populatedNotif = await Notification
                .findById(notif._id)
                .populate('fromUser', 'username');

            const socketId = userSocketMap[userMentioned._id];
            if (socketId) {
                io.to(socketId).emit('new-notification', populatedNotif);
                io.to(socketId).emit('mention-notification', {
                    from:          fromUser.name,
                    channelName:   channel.name,
                    workspaceName: workspace.name,
                    message:       `@${mentionName} a été mentionné.`
                });
            }
        }

        io.to(channel._id.toString()).emit('new-channel-message', {
            _id:         message._id,
            content:     message.content,
            channelId:   channel._id,
            channelName: channel.name,
            sender:      req.user.id,
            createdAt:   message.createdAt,
            validMentions,
            fileUrl:     message.fileUrl
        });

        return res.json(message);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// ----------------------
// GET /api/channels/:channelId/messages
// Lecture des messages d’un canal
// ----------------------
router.get('/:channelId/messages', auth, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) return res.status(404).json({ msg: 'Channel not found' });

        const workspace = await Workspace.findById(channel.workspace);
        if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });
        if (!workspace.members.some(m => m.user.toString() === req.user.id))
            return res.status(403).json({ msg: 'Access denied (not in workspace)' });

        if (channel.type === 'private' &&
            !channel.members.some(u => u.toString() === req.user.id)) {
            return res.status(403).json({ msg: 'Access denied to private channel' });
        }

        const messages = await Message.find({ channel: req.params.channelId })
            .populate('sender', 'name email avatarFileId')
            .populate('reactions.user', 'name')
            .populate('readBy.user', 'name')
            .sort({ createdAt: 1 });

        return res.json(messages);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// ----------------------
// POST /api/channels/:channelId/messages/:messageId/reactions
// Ajouter/modifier une réaction
// ----------------------
router.post('/:channelId/messages/:messageId/reactions', auth, async (req, res) => {
    const { emoji } = req.body;
    try {
        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).json({ msg: 'Message not found' });

        const idx = message.reactions.findIndex(r => String(r.user) === req.user.id);
        if (idx !== -1) {
            message.reactions[idx].emoji = emoji;
        } else {
            message.reactions.push({ emoji, user: req.user.id });
        }
        await message.save();
        await message.populate('reactions.user', 'name');

        const updatedReaction = message.reactions.find(r =>
            String(r.user._id || r.user) === req.user.id
        );
        const io = req.app.get('socketio');
        io.to(req.params.channelId).emit('message-reacted', {
            channelId: req.params.channelId,
            messageId: message._id.toString(),
            reaction:  updatedReaction
        });

        return res.json(message);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// ----------------------
// DELETE /api/channels/:channelId/messages/:messageId
// Supprimer un message (owner/admin/moderator)
// ----------------------
router.delete('/:channelId/messages/:messageId', auth, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.channelId).populate('workspace');
        if (!channel) return res.status(404).json({ msg: 'Channel not found' });

        let workspaceId = channel.workspace._id || channel.workspace;
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });

        const member = workspace.members.find(m => m.user.toString() === req.user.id);
        if (!member) return res.status(403).json({ msg: 'You are not in this workspace' });

        if (!['owner','admin','moderator'].includes(member.role))
            return res.status(403).json({ msg: 'Only owner/admin/moderator can delete messages' });

        const message = await Message.findByIdAndDelete(req.params.messageId);
        if (!message) return res.status(404).json({ msg: 'Message not found' });

        const io = req.app.get('socketio');
        io.to(channel._id.toString()).emit('channel-message-deleted', {
            channelId: req.params.channelId,
            messageId: req.params.messageId
        });

        return res.json({ msg: 'Message deleted successfully' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// ----------------------
// PUT /api/channels/:channelId/messages/:messageId
// Editer un message (uniquement auteur)
// ----------------------
router.put('/:channelId/messages/:messageId', auth, async (req, res) => {
    try {
        const { newContent } = req.body;
        const message = await Message.findById(req.params.messageId);
        if (!message) return res.status(404).json({ msg: 'Message not found' });

        if (message.sender.toString() !== req.user.id)
            return res.status(403).json({ msg: 'Only the author can edit this message' });

        message.content = newContent;
        message.edited  = true;
        await message.save();

        const io = req.app.get('socketio');
        io.to(req.params.channelId).emit('channel-message-updated', {
            channelId:  req.params.channelId,
            messageId:  message._id.toString(),
            newContent,
            edited:     true
        });

        return res.json({ msg: 'Message updated', message });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Server Error');
    }
});

// ----------------------
// PUT /api/channels/:channelId/messages/:messageId/markAsRead
// Marquer un message comme lu
// ----------------------
router.put('/:channelId/messages/:messageId/markAsRead', auth, async (req, res) => {
    try {
        const { channelId, messageId } = req.params;

        // 1) Vérifier le channel et workspace
        const channel   = await Channel.findById(channelId);
        if (!channel)   return res.status(404).json({ msg: 'Channel not found' });
        const workspace = await Workspace.findById(channel.workspace);
        if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });

        // 2) Contrôle d’accès
        if (!workspace.members.some(m => m.user.toString() === req.user.id))
            return res.status(403).json({ msg: 'Access denied (not in workspace)' });
        if (channel.type === 'private' &&
            !channel.members.some(u => u.toString() === req.user.id)) {
            return res.status(403).json({ msg: 'Access denied to private channel' });
        }

        // 3) Marquer comme lu
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ msg: 'Message not found' });

        if (!message.readBy.some(rb => String(rb.user) === req.user.id)) {
            message.readBy.push({ user: req.user.id, readAt: new Date() });
            await message.save();
        }

        // 4) Émettre l’event
        const io = req.app.get('socketio');
        io.to(channelId).emit('message-read', { channelId, messageId, userId: req.user.id });

        // 5) **RENVOI CORRECT** du message mis à jour
        return res.json(message);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
