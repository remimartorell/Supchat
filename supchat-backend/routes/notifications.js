// supchat-backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * Récupère toutes les notifications de l’utilisateur, triées par date décroissante,
 * avec le champ fromUser.username peuplé.
 */
router.get('/', auth, async (req, res) => {
    try {
        const notifications = await Notification
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .populate('fromUser', 'username');
        res.json(notifications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * GET /api/notifications/:id
 * Récupère une notification unique (pour pouvoir la peupler quand on la reçoit par socket).
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const notif = await Notification
            .findById(req.params.id)
            .populate('fromUser', 'username');
        if (!notif) return res.status(404).json({ msg: 'Notification not found' });
        res.json(notif);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * PUT /api/notifications/:id/read
 * Marque la notification comme lue, et renvoie l’objet repopulé
 */
router.put('/:id/read', auth, async (req, res) => {
    try {
        let notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }
        notification.read = true;
        await notification.save();

        // repopulate pour renvoyer fromUser.username
        notification = await Notification
            .findById(req.params.id)
            .populate('fromUser', 'username');

        res.json(notification);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
