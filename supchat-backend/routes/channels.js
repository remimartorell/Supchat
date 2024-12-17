const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');

// @route   POST /api/workspaces/:id/channels
// @desc    Créer un canal dans un workspace
// @access  Privé (membre uniquement)
router.post('/:id/channels', auth, async (req, res) => {
    const { name, type } = req.body;

    try {
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // Vérifier que l'utilisateur est membre du workspace
        if (!workspace.members.includes(req.user.id)) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const newChannel = new Channel({
            name,
            type: type || 'public',
            workspace: req.params.id,
        });

        await newChannel.save();
        res.json(newChannel);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/workspaces/:id/channels
// @desc    Récupérer les canaux d'un workspace
// @access  Privé (membre uniquement)
router.get('/:id/channels', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // Vérifier que l'utilisateur est membre du workspace
        if (!workspace.members.includes(req.user.id)) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const channels = await Channel.find({ workspace: req.params.id });
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

        // Vérifier que l'utilisateur est le propriétaire du workspace
        if (workspace.owner.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied' });
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

module.exports = router;