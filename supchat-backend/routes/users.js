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
            console.log('❌ Utilisateur introuvable');
            return res.status(404).send('User not found');
        }

        if (!user.avatarFileId) {
            console.log('⚠️ Pas de avatarFileId pour cet utilisateur :', user.name);
            return res.status(404).send('No avatar');
        }

        console.log('✅ AvatarFileId trouvé :', user.avatarFileId);

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads',
        });

        let _id;
        try {
            _id = new mongoose.Types.ObjectId(user.avatarFileId);
        } catch (err) {
            console.error("❌ avatarFileId invalide :", user.avatarFileId);
            return res.status(400).send('Invalid avatar ID');
        }

        res.set('Content-Type', 'image/jpeg');

        bucket.openDownloadStream(_id)
            .on('error', (err) => {
                console.error('Erreur GridFS:', err);
                res.status(500).send('Erreur lecture avatar');
            })
            .pipe(res);

    } catch (err) {
        console.error('❌ Erreur get avatar:', err);
        res.status(500).send('Erreur serveur');
    }
});

module.exports = router;
