const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

// @route   POST /api/workspaces/:id/channels
// @desc    Créer un canal dans un workspace
// @access  Privé (membre uniquement)
router.post('/:workspaceId/channels', auth, async (req, res) => {
    const { name, type, members } = req.body;
    try {
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });

        const isMember = workspace.members.some(m => m.user.toString() === req.user.id);
        if (!isMember) return res.status(403).json({ msg: 'Access denied' });

        const newChannel = new Channel({
            name,
            type: type || 'public',
            workspace: req.params.workspaceId,
            members: (type === 'private') ? [req.user.id, ...(members || [])] : []
        });

        await newChannel.save();

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
// @access  Privé
router.get('/:workspaceId/channels', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });

        const isMember = workspace.members.some(m => m.user.toString() === req.user.id);
        if (!isMember) return res.status(403).json({ msg: 'Access denied' });

        const channels = await Channel.find({ workspace: req.params.workspaceId }).populate('members', 'name email');
        res.json(channels);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route GET /api/channels/:channelId/messages
// @desc Récupérer les messages d’un canal (y compris bots)
// @access Privé
router.get('/:workspaceId/channels/:channelId/messages', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });

        const isMember = workspace.members.some(m => m.user.toString() === req.user.id);
        if (!isMember) return res.status(403).json({ msg: 'Access denied' });

        const channel = await Channel.findById(req.params.channelId);
        if (!channel) return res.status(404).json({ msg: 'Channel not found' });

        const messages = await Message.find({ channel: req.params.channelId }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/workspaces/:id/channels/:channelId
// @desc    Supprimer un canal
// @access  Privé (admin ou owner)
router.delete('/:workspaceId/channels/:channelId', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });

        const currentMember = workspace.members.find(m => m.user.toString() === req.user.id);
        if (workspace.owner.toString() !== req.user.id && (!currentMember || !['owner', 'admin'].includes(currentMember.role))) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const channel = await Channel.findById(req.params.channelId);
        if (!channel) return res.status(404).json({ msg: 'Channel not found' });

        await Channel.findByIdAndDelete(req.params.channelId);

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

// @route POST /api/:workspaceId/channels/:channelId/members
// @desc Ajouter un membre dans un canal privé
// @access Privé (admin/owner)
router.post('/:workspaceId/channels/:channelId/members', auth, async (req, res) => {
    try {
        const { memberId } = req.body;

        const channel = await Channel.findById(req.params.channelId);
        const workspace = await Workspace.findById(req.params.workspaceId);
        if (!channel || !workspace) return res.status(404).json({ msg: 'Channel or workspace not found' });

        const currentMember = workspace.members.find(m => m.user.toString() === req.user.id);
        if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
            return res.status(403).json({ msg: 'Only workspace owner/admin can add members' });
        }

        if (!channel.members.includes(memberId)) {
            channel.members.push(memberId);
            await channel.save();
        }

        const io = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        const socketId = userSocketMap[memberId];
        if (socketId) {
            io.to(socketId).emit('channel-added', channel);
        }

        res.json({ msg: 'Member added to channel', channel });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route DELETE /api/:workspaceId/channels/:channelId/members/:userId
// @desc Retirer un membre d’un canal
// @access Privé (admin/owner)
router.delete('/:workspaceId/channels/:channelId/members/:userId', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.workspaceId);
        const channel = await Channel.findById(req.params.channelId);
        if (!workspace || !channel) return res.status(404).json({ msg: 'Workspace or channel not found' });

        const currentMember = workspace.members.find(m => m.user.toString() === req.user.id);
        if (!currentMember || !['owner', 'admin'].includes(currentMember.role)) {
            return res.status(403).json({ msg: 'Only workspace owner/admin can remove members' });
        }

        const originalLength = channel.members.length;
        channel.members = channel.members.filter(m => m.toString() !== req.params.userId);
        if (channel.members.length === originalLength) {
            return res.status(404).json({ msg: 'Member not in channel' });
        }

        await channel.save();

        const io = req.app.get('socketio');
        const userSocketMap = req.app.get('userSocketMap');
        workspace.members.forEach(member => {
            const socketId = userSocketMap[member.user.toString()];
            if (socketId) {
                io.to(socketId).emit('channel-updated', channel);
            }
        });

        res.json({ msg: 'Member removed', channel });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
