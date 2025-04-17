// routes/meetings.js
const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting'); // Vérifiez que le chemin est correct

// Créer une réunion
router.post('/', async (req, res) => {
    const { title, startTime } = req.body;
    if (!title || !startTime) {
        return res.status(400).json({ msg: 'Title et startTime sont requis.' });
    }
    try {
        const newMeeting = new Meeting({ title, startTime });
        await newMeeting.save();
        res.status(201).json(newMeeting);
    } catch (error) {
        console.error('Erreur lors de la création de la réunion :', error);
        res.status(500).json({ msg: 'Erreur lors de la création de la réunion.' });
    }
});

module.exports = router;
