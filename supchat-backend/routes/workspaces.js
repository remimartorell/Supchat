const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Workspace = require('../models/Workspace');

// @route   POST /api/workspaces
// @desc    Créer un workspace
// @access  Privé
router.post('/', auth, async (req, res) => {
    const { name } = req.body;

    try {
        const newWorkspace = new Workspace({
            name,
            owner: req.user.id,
            members: [req.user.id],
        });

        const workspace = await newWorkspace.save();
        res.json(workspace);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/workspaces
// @desc    Obtenir les workspaces de l'utilisateur connecté
// @access  Privé
router.get('/', auth, async (req, res) => {
    try {
        const workspaces = await Workspace.find({ members: req.user.id });
        res.json(workspaces);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/workspaces/:id/members
// @desc    Ajouter un membre à un workspace
// @access  Privé
router.post('/:id/members', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // Vérifier que l'utilisateur actuel est membre du workspace
        if (!workspace.members.includes(req.user.id)) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const { memberId } = req.body;

        // Ajouter le membre si ce n'est pas déjà fait
        if (!workspace.members.includes(memberId)) {
            workspace.members.push(memberId);
            await workspace.save();
            return res.json({ msg: 'Member added successfully', workspace });
        } else {
            return res.status(400).json({ msg: 'User is already a member' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/workspaces/:id
// @desc    Modifier un workspace (nom uniquement)
// @access  Privé (propriétaire uniquement)
router.put('/:id', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // Vérifier que l'utilisateur actuel est le propriétaire
        if (workspace.owner.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const { name } = req.body;

        if (name) workspace.name = name;

        await workspace.save();
        res.json({ msg: 'Workspace updated successfully', workspace });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/workspaces/:id
// @desc    Supprimer un workspace
// @access  Privé (propriétaire uniquement)
router.delete('/:id', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // Vérifier que l'utilisateur actuel est le propriétaire
        if (workspace.owner.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        await Workspace.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Workspace deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;
