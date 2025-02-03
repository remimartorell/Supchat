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

        // Vérifier qu'on est membre du workspace
        const workspace = await Workspace.findById(channel.workspace);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }
        const isWorkspaceMember = workspace.members.some(m => m.user.toString() === req.user.id);
        if (!isWorkspaceMember) {
            return res.status(403).json({ msg: 'Access denied (not in workspace)' });
        }

        // Si channel.type === 'private' => vérifier channel.members
        if (channel.type === 'private') {
            const isInChannel = channel.members.some(u => u.toString() === req.user.id);
            if (!isInChannel) {
                return res.status(403).json({ msg: 'Access denied to private channel' });
            }
        }


        // On crée et sauvegarde le message
        const newMessage = new Message({
            content,
            fileUrl: req.file ? `http://localhost:3000/uploads/${req.file.filename}` : null,
            channel: req.params.channelId,
            sender: req.user.id,
        });

        const message = await newMessage.save();

        // 3. Récup io & userSocketMap
        const io = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');

        const mentions = JSON.parse(req.body.mentions || '[]');
        const validMentions = []; // On va y mettre seulement les mentionNames qui existent

        const fromUser = await User.findById(req.user.id).select('name');

        for (const mentionName of mentions) {
            // On cherche un user par name
            const userMentioned = await User.findOne({ name: mentionName });
            if (userMentioned) {
                validMentions.push(mentionName); // on l'ajoute à la liste

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
                        from: fromUser?.name || 'Unknown',
                        channelName: channel.name,
                        workspaceName: workspace?.name || '',
                        message: `@${mentionName} a été mentionné.`
                    });
                }
            }
        }

        io.to(req.params.channelId).emit('new-channel-message', {
            _id: message._id,
            content: message.content,
            channelId: req.params.channelId,
            channel: req.params.channelId,
            channelName: channel.name, // << on affiche #NomDuChannel
            sender: req.user.id, // ou { _id: user._id, name: user.name }
            createdAt: message.createdAt,
            validMentions, // on renvoie la liste des mentions valide
            fileUrl: message.fileUrl,
        });

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

        // Vérifier qu'on est membre du workspace
        const workspace = await Workspace.findById(channel.workspace);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }
        const isWorkspaceMember = workspace.members.some(m => m.user.toString() === req.user.id);
        if (!isWorkspaceMember) {
            return res.status(403).json({ msg: 'Access denied (not in workspace)' });
        }

        // Si le channel est private => vérifier qu'on fait partie de channel.members
        if (channel.type === 'private') {
            const isInChannel = channel.members.some(u => u.toString() === req.user.id);
            if (!isInChannel) {
                return res.status(403).json({ msg: 'Access denied to private channel' });
            }
        }

        // Récupérer tous les messages
        const messages = await Message.find({ channel: req.params.channelId })
            .populate('sender', 'name email')
            .populate('reactions.user','name') // <= on peuple la clé user dans reactions
            .sort({ createdAt: 'asc' });

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
        let message = await Message.findById(req.params.messageId);
        if (!message) {
            return res.status(404).json({ msg: 'Message not found' });
        }
        // Vérifier s’il existe déjà une réaction de cet utilisateur
        const existingIdx = message.reactions.findIndex(r => String(r.user) === req.user.id);
        if (existingIdx !== -1) {
            message.reactions[existingIdx].emoji = emoji;
        } else {
            message.reactions.push({ emoji, user: req.user.id });
        }
        await message.save();
        // Peupler les données utilisateur dans la réaction de l'utilisateur courant
        await message.populate('reactions.user', 'name');
        const updatedReaction = message.reactions.find(r => String(r.user._id || r.user) === req.user.id);
        const io = req.app.get('socketio');
        io.to(req.params.channelId).emit('message-reacted', {
            channelId: req.params.channelId,
            messageId: message._id.toString(),
            reaction: updatedReaction
        });
        res.json(message);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   DELETE /api/channels/:channelId/messages/:messageId
// @desc    Supprimer un message
// @access  Privé (owner/admin/moderator)
router.delete('/:channelId/messages/:messageId', auth, async (req, res) => {
    try {
        // 1) Retrouver le channel
        const channel = await Channel.findById(req.params.channelId).populate('workspace');
        if (!channel) {
            return res.status(404).json({ msg: 'Channel not found' });
        }

        // 2) Retrouver le workspace
        let workspaceId = channel.workspace;
        // si .populate('workspace') => channel.workspace est un obj
        if (channel.workspace._id) {
            workspaceId = channel.workspace._id;
        }
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // 3) Vérifier qu'on est membre
        const currentMember = workspace.members.find(m => m.user.toString() === req.user.id);
        if (!currentMember) {
            return res.status(403).json({ msg: 'You are not in this workspace' });
        }

        // 4) Rôles autorisés: owner, admin, moderator
        if (!['owner','admin','moderator'].includes(currentMember.role)) {
            return res.status(403).json({ msg: 'Only moderators/admin/owner can delete messages' });
        }

        // 5) On supprime le message
        const message = await Message.findByIdAndDelete(req.params.messageId);
        if (!message) {
            return res.status(404).json({ msg: 'Message not found' });
        }

        // Émettre l'événement via Socket.IO
        const io = req.app.get('socketio');
        // Envoyer à la “room” = channelId
        io.to(req.params.channelId).emit('channel-message-deleted', {
            channelId: req.params.channelId,
            messageId: req.params.messageId,
        });

        res.json({ msg: 'Message deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/:channelId/messages/:messageId', auth, async (req, res) => {
    try {
        const { newContent } = req.body;

        // 1) Retrouver le message
        let message = await Message.findById(req.params.messageId);
        if (!message) {
            return res.status(404).json({ msg: 'Message not found' });
        }

        // 2) Vérifier que c’est bien l’auteur qui édite
        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Only the author can edit this message' });
        }

        // 3) Mettre à jour
        message.content = newContent;
        message.edited = true;  // => Pour afficher (Modifié)

        await message.save();

        // 4) Émettre un event "channel-message-updated"
        const io = req.app.get('socketio');
        io.to(req.params.channelId).emit('channel-message-updated', {
            channelId: req.params.channelId,
            messageId: message._id.toString(),
            newContent,
            edited: true,
        });

        res.json({ msg: 'Message updated', message });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;