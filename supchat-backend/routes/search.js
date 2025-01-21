// supchat-backend/routes/search.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Channel = require('../models/Channel');
const User = require('../models/User');
const Message = require('../models/Message');
const DirectMessage = require('../models/DirectMessage'); // si tu as un model distinct

// @route   GET /api/search
// @desc    Rechercher dans Channels, Users, Messages, DMs
// @access  Privé
router.get('/', auth, async (req, res) => {
    try {
        const query = req.query.query?.trim() || '';
        if (!query) {
            return res.json({
                channels: [],
                users: [],
                channelMessages: [],
                dmMessages: [],
            });
        }

        // 1) Rechercher des Channels (par nom)
        const channels = await Channel.find({
            name: { $regex: query, $options: 'i' }
        }).limit(20);

        // 2) Rechercher des Users (par name ou email)
        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
            ]
        }).limit(20).select('-password');

        // 3) Rechercher dans les Messages de channel (via content)
        //    On peut limiter à 50 résultats, par ex.
        const channelMessages = await Message.find({
            content: { $regex: query, $options: 'i' },
        })
            .limit(50)
            .populate('sender', 'name email')
            .populate('channel', 'name workspace') // pour récupérer le channelName
            .sort({ createdAt: -1 }); // tri par date desc ?

        // 4) Rechercher dans les DirectMessages
        const dmMessages = await DirectMessage.find({ content: { $regex: query, $options: 'i' } })
            .limit(50)
            .populate('sender', 'name email')
            .populate('receiver', 'name email')
            .sort({ createdAt: -1 });


        // Renvoyer un objet
        return res.json({
            channels,
            users,
            channelMessages,
            dmMessages,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
