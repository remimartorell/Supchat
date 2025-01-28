// supchat-backend/routes/workspaces.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Workspace = require('../models/Workspace');

// Petite fonction de hiérarchie
function roleRank(role) {
    switch (role) {
        case 'owner': return 4;
        case 'admin': return 3;
        case 'moderator': return 2;
        case 'member': return 1;
        default: return 0;
    }
}

// @route   POST /api/workspaces
// @desc    Créer un workspace
// @access  Privé
router.post('/', auth, async (req, res) => {
    const { name } = req.body;

    try {
        const newWorkspace = new Workspace({
            name,
            owner: req.user.id,
            members: [
                {
                    user: req.user.id,
                    role: 'owner'
                }
            ],
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
        const workspaces = await Workspace.find({ "members.user": req.user.id });
        res.json(workspaces);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/workspaces/:id
// @desc    Obtenir un workspace (avec les membres populés)
// @access  Privé
router.get('/:id', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id)
            .populate('members.user', 'name email');

        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // Vérifier que l'utilisateur est membre
        const isMember = workspace.members.some(m => m.user._id.toString() === req.user.id);
        if (!isMember) {
            return res.status(403).json({ msg: 'Access denied (not a member)' });
        }

        res.json(workspace);
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
        const { memberId, role } = req.body;
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // Vérifier que req.user est déjà membre
        const currentMember = workspace.members.find(m => m.user.toString() === req.user.id);
        if (!currentMember) {
            return res.status(403).json({ msg: 'Access denied (not a member)' });
        }
        // Optionnel : if (roleRank(currentMember.role) < 3) => n’autorise pas

        const already = workspace.members.find(m => m.user.toString() === memberId);
        if (already) {
            return res.status(400).json({ msg: 'User is already a member' });
        }

        workspace.members.push({
            user: memberId,
            role: role || 'member',
        });

        await workspace.save();

        // Émettre un event "workspace-updated"
        const io = req.app.get('socketio');
        io.emit('workspace-updated', {
            workspaceId: workspace._id,
            action: 'memberAdded',
            newMemberId: memberId,
            newMemberRole: role || 'member'
        });

        return res.json({ msg: 'Member added successfully', workspace });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/workspaces/:id
// @desc    Modifier un workspace (nom uniquement)
// @access  Privé (owner)
router.put('/:id', auth, async (req, res) => {
    try {
        const { name } = req.body;
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        if (workspace.owner.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        if (name) workspace.name = name;
        await workspace.save();

        // On peut émettre un event si besoin (ex: rename)
        const io = req.app.get('socketio');
        io.emit('workspace-updated', {
            workspaceId: workspace._id,
            action: 'workspaceRenamed',
            newName: name
        });

        res.json({ msg: 'Workspace updated successfully', workspace });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/workspaces/:id
// @desc    Supprimer un workspace
// @access  Privé (owner)
router.delete('/:id', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        if (workspace.owner.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        await Workspace.findByIdAndDelete(req.params.id);

        // Émettre un event "workspace-removed"
        const io = req.app.get('socketio');
        io.emit('workspace-removed', { workspaceId: req.params.id });

        res.json({ msg: 'Workspace deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/workspaces/:id/members/:memberId
// @desc    Mettre à jour le rôle d'un membre
// @access  Privé (owner/admin)
router.put('/:id/members/:memberId', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        // Qui est l'utilisateur actuel ?
        const currentUserId = req.user.id;
        const currentMember = workspace.members.find(m => m.user.toString() === currentUserId);
        if (!currentMember) {
            return res.status(403).json({ msg: 'You are not a member of this workspace' });
        }

        // Seuls 'owner' ou 'admin' peuvent tenter de changer un rôle
        if (!['owner', 'admin'].includes(currentMember.role)) {
            return res.status(403).json({ msg: 'Only owner or admin can change roles' });
        }

        // Le nouveau rôle
        const { newRole } = req.body;
        if (!['owner','admin','moderator','member'].includes(newRole)) {
            return res.status(400).json({ msg: 'Invalid role' });
        }

        // On cherche la personne ciblée
        const memberIdToUpdate = req.params.memberId;
        const memberObj = workspace.members.find(m => m.user.toString() === memberIdToUpdate);
        if (!memberObj) {
            return res.status(404).json({ msg: 'Member not found in this workspace' });
        }

        // Comparaison des rangs
        //  - Interdire de changer le rôle d'une personne de rang >=
        //  - Interdire d'assigner un rôle >= au sien
        if (roleRank(currentMember.role) <= roleRank(memberObj.role)) {
            return res.status(403).json({ msg: 'Cannot change role of someone with equal or higher role' });
        }
        if (roleRank(currentMember.role) <= roleRank(newRole)) {
            return res.status(403).json({ msg: 'Cannot assign a role equal or higher than your own' });
        }

        memberObj.role = newRole;
        await workspace.save();

        // Émettre un event
        const io = req.app.get('socketio');
        io.emit('workspace-updated', {
            workspaceId: workspace._id,
            action: 'roleChanged',
            userId: memberIdToUpdate,
            newRole,
        });

        res.json({ msg: 'Role updated successfully', workspace });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/workspaces/:id/members/:memberId
// @desc    Supprimer un membre du workspace
// @access  Privé (owner/admin)
router.delete('/:id/members/:memberId', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id);
        if (!workspace) {
            return res.status(404).json({ msg: 'Workspace not found' });
        }

        const currentMember = workspace.members.find(m => m.user.toString() === req.user.id);
        if (!currentMember) {
            return res.status(403).json({ msg: 'Access denied (not a member)' });
        }
        if (!['owner', 'admin'].includes(currentMember.role)) {
            return res.status(403).json({ msg: 'Not authorized to remove member' });
        }

        const beforeCount = workspace.members.length;
        workspace.members = workspace.members.filter(m => m.user.toString() !== req.params.memberId);

        if (workspace.members.length === beforeCount) {
            return res.status(404).json({ msg: 'Member not found in this workspace' });
        }

        await workspace.save();

        // Émettre un event
        const io = req.app.get('socketio');
        io.emit('workspace-updated', {
            workspaceId: workspace._id,
            action: 'memberRemoved',
            removedMemberId: req.params.memberId,
        });

        res.json({ msg: 'Member removed successfully', workspace });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;