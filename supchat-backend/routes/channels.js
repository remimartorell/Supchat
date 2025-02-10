const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');

// @route   POST /api/workspaces/:id/channels
// @desc    Créer un canal dans un workspace
// @access  Privé (membre uniquement)
router.post('/:workspaceId/channels', auth, async (req, res) => {
    const { name, type, members } = req.body; // members = tableau d'userIds
    try {
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }
        const isMember = workspace.members.some(m => m.user.toString() === req.user.id);
        if (!isMember) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const newChannel = new Channel({
            name,
            type: type || 'public',
            workspace: req.params.workspaceId,
            members: (type === 'private')
                ? [ req.user.id, ...(members || []) ]
                : []
        });

        await newChannel.save();

        // Émettre un événement pour notifier tous les membres du workspace
        const io = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        workspace.members.forEach(member => {
            const socketId = userSocketMap[member.user.toString()];
            if (socketId) {
                io.to(socketId).emit('channel-added', newChannel);
            }
        });

        res.json(newChannel);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/workspaces/:id/channels
// @desc    Récupérer les canaux d'un workspace
// @access  Privé (membre uniquement)
router.get('/:workspaceId/channels', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }
        const isMember = workspace.members.some(m => m.user.toString() === req.user.id);
        if (!isMember) {
            return res.status(403).json({ msg: 'Access denied' });
        }
        const channels = await Channel.find({ workspace: req.params.workspaceId })
            .populate('members', 'name email');
        res.json(channels);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/workspaces/:id/channels/:channelId
// @desc    Supprimer un canal
// @access  Privé (propriétaire du workspace uniquement)
router.delete('/:id/channels/:channelId', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // Vérifier role: owner ou admin
        if (workspace.owner.toString() !== req.user.id) {
            // alors on check le membership
            const currentMember = workspace.members.find(m => m.user.toString() === req.user.id);
            if (!currentMember) {
                return res.status(403).json({ msg: 'Access denied' });
            }
            if (!(currentMember.role === 'owner' || currentMember.role === 'admin')) {
                return res.status(403).json({ msg: 'Access denied' });
            }
        }

        const channel = await Channel.findById(req.params.channelId);
        if (!channel) {
            return res.status(404).json({ msg: 'Channel not found' });
        }

        // Supprimer le canal
        await Channel.findByIdAndDelete(req.params.channelId);

        res.json({ msg: 'Channel deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route POST /api/channels/:channelId/members
// @desc Ajouter un membre au channel (private)
router.post('/:workspaceId/channels/:channelId/members', auth, async (req, res) => {
    try {
        const { memberId } = req.body;
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) {
            return res.status(404).json({ msg: 'Channel not found' });
        }
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }
        const currentMember = workspace.members.find(m => m.user.toString() === req.user.id);
        if (!currentMember) {
            return res.status(403).json({ msg: 'Access denied (not in workspace)' });
        }
        if (!(currentMember.role === 'owner' || currentMember.role === 'admin')) {
            return res.status(403).json({ msg: 'Only workspace owner/admin can add members to this channel' });
        }
        if (!channel.members.includes(memberId)) {
            channel.members.push(memberId);
            await channel.save();
        }
        // Émettre un événement socket pour notifier l'utilisateur ajouté (afin qu'il voie le canal en direct)
        const io = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        const addedMemberSocketId = userSocketMap[memberId];
        if (addedMemberSocketId) {
            io.to(addedMemberSocketId).emit('channel-added', channel);
        }
        res.json({ msg: 'Member added to channel', channel });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


// @route DELETE /api/channels/:channelId/members/:userId
// @desc Retirer un membre d'un channel privé
router.delete('/:workspaceId/channels/:channelId', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // Vérification des droits (owner ou admin, par exemple)
        if (workspace.owner.toString() !== req.user.id) {
            const currentMember = workspace.members.find(m => m.user.toString() === req.user.id);
            if (!currentMember || !(currentMember.role === 'owner' || currentMember.role === 'admin')) {
                return res.status(403).json({ msg: 'Access denied' });
            }
        }

        const channel = await Channel.findById(req.params.channelId);
        if (!channel) {
            return res.status(404).json({ msg: 'Channel not found' });
        }

        await Channel.findByIdAndDelete(req.params.channelId);

        // Émettre un événement pour notifier tous les membres du workspace
        const io = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        workspace.members.forEach(member => {
            const socketId = userSocketMap[member.user.toString()];
            if (socketId) {
                io.to(socketId).emit('channel-deleted', { channelId: req.params.channelId });
            }
        });

        res.json({ msg: 'Channel deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.delete('/:workspaceId/channels/:channelId/members/:userId', auth, async (req, res) => {
    try {
        // Récupérer le canal
        const channel = await Channel.findById(req.params.channelId);
        if (!channel) {
            return res.status(404).json({ msg: 'Channel not found' });
        }

        // Récupérer le workspace
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // Vérifier que l'utilisateur connecté dispose des droits nécessaires (seulement owner ou admin)
        const currentMember = workspace.members.find(m => m.user.toString() === req.user.id);
        if (!currentMember || !(['owner', 'admin'].includes(currentMember.role))) {
            return res.status(403).json({ msg: 'Only workspace owner/admin can remove a member from this channel' });
        }

        // Retirer le membre du tableau "members" du canal
        const originalLength = channel.members.length;
        channel.members = channel.members.filter(m => m.toString() !== req.params.userId);
        if (channel.members.length === originalLength) {
            return res.status(404).json({ msg: 'Member not found in channel' });
        }
        await channel.save();

        // (Optionnel) Émettre un événement Socket.IO pour notifier tous les membres du workspace que le canal a été mis à jour
        const io = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        workspace.members.forEach(member => {
            const socketId = userSocketMap[member.user.toString()];
            if (socketId) {
                io.to(socketId).emit('channel-updated', channel);
            }
        });

        res.json({ msg: 'Member removed from channel', channel });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;