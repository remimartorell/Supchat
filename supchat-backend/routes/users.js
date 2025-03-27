/* supchat-backend/routes/users.js */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

// GET /api/users/:id/avatar => renvoie l'avatar (flux binaire)
router.get('/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send('User not found');
        }
        if (!user.avatarFileId) {
            return res.status(404).send('No avatar');
        }

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'avatars',
        });

        const _id = new mongoose.Types.ObjectId(user.avatarFileId);
        res.set('Content-Type', 'image/jpeg');
        bucket.openDownloadStream(_id)
            .on('error', (err) => {
                console.error('Erreur GridFS:', err);
                res.status(500).send('Erreur lecture avatar');
            })
            .pipe(res);

    } catch (err) {
        console.error('Erreur get avatar:', err);
        res.status(500).send('Erreur serveur');
    }
});

module.exports = router;
