// routes/auth.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const Workspace = require('../models/Workspace');
const transporter = require('../config/email');
const upload = require('../middleware/upload');
const { MongoClient, GridFSBucket } = require('mongodb');

// =========================
// 1) REGISTER AVEC VERIFICATION PAR EMAIL
// =========================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, acceptedTerms } = req.body;

        if (!acceptedTerms) {
            return res
                .status(400)
                .json({ msg: 'Vous devez accepter les Conditions d’utilisation & RGPD.' });
        }

        let user = await User.findOne({ email });
        if (user) {
            return res
                .status(400)
                .json({ msg: 'Un compte existe déjà avec cette adresse email.' });
        }

        user = new User({ name, email, password, isVerified: false });
        const verificationToken = crypto.randomBytes(20).toString('hex');
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = Date.now() + 24 * 3600 * 1000; // 24h
        await user.save();

        const verifyURL = `${process.env.BACK_URL}/api/auth/verify-email?token=${verificationToken}`;
        const mailOptions = {
            from: 'Support SupChat <contact@supchat.info>',
            to: user.email,
            subject: 'Confirmez votre compte SupChat',
            html: `
        <h1>Bienvenue sur SupChat</h1>
        <p>Merci de vous être inscrit. Cliquez sur le lien ci-dessous pour confirmer votre compte :</p>
        <a href="${verifyURL}">Activer mon compte</a>
        <p>Ce lien expire dans 24 heures.</p>
      `,
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailErr) {
            console.error('⚠️ Erreur mail de vérification :', mailErr);
        }

        return res.json({
            msg: 'Inscription réussie ! Vérifiez votre boîte mail pour activer votre compte.',
        });
    } catch (err) {
        console.error('❌ Erreur register :', err);
        return res.status(500).json({ msg: 'Erreur serveur', error: err.message });
    }
});

// =========================
// 2) LOGIN
// =========================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Identifiants invalides' });
        if (!user.isVerified) {
            return res
                .status(403)
                .json({ msg: 'Votre compte n’est pas activé. Vérifiez vos emails.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Identifiants invalides' });

        const payload = { user: { id: user._id } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        return res.json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                theme: user.theme,
            },
        });
    } catch (err) {
        console.error('❌ Erreur login :', err);
        return res.status(500).json({ msg: 'Erreur serveur' });
    }
});

// =========================
// 3) GET CURRENT USER
// =========================
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'Utilisateur introuvable' });
        return res.json(user);
    } catch (err) {
        console.error('❌ Erreur get user :', err);
        return res.status(500).json({ msg: 'Erreur serveur' });
    }
});

// =========================
// 4) GET ALL USERS
// =========================
router.get('/allUsers', auth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        return res.json(users);
    } catch (err) {
        console.error('❌ Erreur allUsers :', err);
        return res.status(500).json({ msg: 'Erreur serveur' });
    }
});

// =========================
// 5) UPDATE PROFILE (thème & avatar)
// =========================
router.put('/update', auth, upload.single('avatarFile'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'Utilisateur introuvable' });

        const {
            name,
            email,
            theme,
            oldPassword,
            newPassword,
            confirmPassword,
        } = req.body;
        const oldEmail = user.email;
        let nameChanged = false,
            emailChanged = false,
            passwordChanged = false,
            themeChanged = false;

        if (name && name !== user.name) {
            user.name = name;
            nameChanged = true;
        }
        if (email && email !== user.email) {
            user.email = email;
            emailChanged = true;
        }
        if (theme && theme !== user.theme) {
            user.theme = theme;
            themeChanged = true;
        }
        if (newPassword && newPassword.trim()) {
            if (!oldPassword) {
                return res.status(400).json({ msg: 'Ancien mot de passe requis' });
            }
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Ancien mot de passe incorrect' });
            }
            if (newPassword !== confirmPassword) {
                return res
                    .status(400)
                    .json({ msg: 'Nouveau mot de passe et confirmation ne correspondent pas' });
            }
            user.password = newPassword;
            passwordChanged = true;
        }

        // avatar via GridFS
        if (req.file) {
            const client = await MongoClient.connect(process.env.MONGO_URI);
            const db = client.db();
            const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
            const stream = bucket.openUploadStream(req.file.originalname, {
                contentType: req.file.mimetype,
                metadata: { originalname: req.file.originalname },
            });

            stream.on('finish', async () => {
                user.avatarFileId = stream.id.toString();
                await user.save();
                await handleEmailChanges(
                    user,
                    oldEmail,
                    nameChanged,
                    emailChanged,
                    passwordChanged
                );
                return res.json({
                    msg: 'Profil mis à jour',
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        theme: user.theme,
                        avatarFileId: user.avatarFileId,
                    },
                });
            });

            stream.on('error', (err) => {
                console.error('❌ Erreur GridFS upload :', err);
                return res.status(500).json({ msg: 'Erreur upload fichier' });
            });

            stream.end(req.file.buffer);
            return;
        }

        await user.save();
        await handleEmailChanges(user, oldEmail, nameChanged, emailChanged, passwordChanged);

        return res.json({
            msg: 'Profil mis à jour',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                theme: user.theme,
                avatarFileId: user.avatarFileId,
            },
        });
    } catch (err) {
        console.error('❌ Erreur update user :', err);
        return res.status(500).json({ msg: 'Erreur serveur' });
    }
});

async function handleEmailChanges(
    user,
    oldEmail,
    nameChanged,
    emailChanged,
    passwordChanged
) {
    if (nameChanged) {
        await transporter.sendMail({
            from: 'Support SupChat <contact@supchat.info>',
            to: user.email,
            subject: 'Changement de pseudo',
            html: `<p>Bonjour ${user.name},</p><p>Votre pseudo a été modifié : <strong>${user.name}</strong>.</p>`,
        });
    }
    if (emailChanged) {
        await transporter.sendMail({
            from: 'Support SupChat <contact@supchat.info>',
            to: oldEmail,
            subject: 'Modification de votre adresse email',
            html: `<p>Votre adresse email a été modifiée. Nouvelle adresse : <strong>${user.email}</strong>.</p>`,
        });
        await transporter.sendMail({
            from: 'Support SupChat <contact@supchat.info>',
            to: user.email,
            subject: 'Votre nouvelle adresse email',
            html: `<p>Votre adresse email a bien été mise à jour : <strong>${user.email}</strong>.</p>`,
        });
    }
    if (passwordChanged) {
        await transporter.sendMail({
            from: 'Support SupChat <contact@supchat.info>',
            to: user.email,
            subject: 'Modification de votre mot de passe',
            html: `<p>Bonjour ${user.name},</p><p>Votre mot de passe a été modifié avec succès.</p>`,
        });
    }
}

// =========================
// 6) VERIFY EMAIL
// =========================
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ msg: 'Aucun token fourni' });

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() },
        });
        if (!user) return res.status(400).json({ msg: 'Token invalide ou expiré' });

        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        return res.send(`
      <h1>Votre compte est vérifié !</h1>
      <p>Vous pouvez maintenant vous connecter : <a href="${process.env.CLIENT_URL}/login">Connexion</a></p>
    `);
    } catch (err) {
        console.error('❌ Erreur verify-email :', err);
        return res.status(500).json({ msg: 'Erreur serveur' });
    }
});

// =========================
// 7) FORGOT PASSWORD
// =========================
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res
                .status(200)
                .json({ msg: 'Si ce mail existe, vous recevrez un lien de réinitialisation.' });
        }
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600 * 1000; // 1h
        await user.save();

        const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
        await transporter.sendMail({
            from: 'Support SupChat <contact@supchat.info>',
            to: user.email,
            subject: 'Réinitialiser votre mot de passe',
            html: `
        <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez ici :</p>
        <a href="${resetURL}">Choisir un nouveau mot de passe</a>
      `,
        });

        return res.status(200).json({ msg: 'Email de réinitialisation envoyé !' });
    } catch (err) {
        console.error('❌ Erreur forgot-password :', err);
        return res.status(500).json({ msg: 'Erreur serveur' });
    }
});

// =========================
// 8) RESET PASSWORD
// =========================
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({ msg: 'Données manquantes' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ msg: 'Les mots de passe ne correspondent pas' });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({ msg: 'Token invalide ou expiré' });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        await transporter.sendMail({
            from: 'Support SupChat <contact@supchat.info>',
            to: user.email,
            subject: 'Votre mot de passe a été réinitialisé',
            html: `
        <p>Bonjour ${user.name},</p>
        <p>Votre mot de passe a été réinitialisé avec succès.</p>
      `,
        });

        return res.status(200).json({ msg: 'Mot de passe réinitialisé !' });
    } catch (err) {
        console.error('❌ Erreur reset-password :', err);
        return res.status(500).json({ msg: 'Erreur serveur' });
    }
});

// =========================
// 9) EXPORTATION DES DONNÉES PERSONNELLES (RGPD)
// =========================
router.get('/export-data', auth, async (req, res) => {
    try {
        // !!! ici on utilise new pour l’ObjectId
        const userId = new mongoose.Types.ObjectId(req.user.id);

        // 1️⃣ Profil
        const user = await User.findById(userId).select('-password -__v').lean();
        // 2️⃣ Messages
        const messages = await Message.find({ author: userId }).lean();
        // 3️⃣ Workspaces
        const workspaces = await Workspace.find({ members: userId }).lean();

        const exportData = {
            exportedAt: new Date().toISOString(),
            user,
            messages,
            workspaces,
        };

        const filename = `supchat-export-${user.email.replace(/[@.]/g, '_')}-${Date.now()}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        return res.send(JSON.stringify(exportData, null, 2));
    } catch (err) {
        console.error('❌ Erreur export-data :', err);
        return res
            .status(500)
            .json({ msg: 'Erreur serveur lors de l’export des données' });
    }
});


// ========== AJOUT AUTH FACEBOOK (OAuth) ==========

const passport = require('passport');

// Route pour démarrer l'auth Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

// Callback Facebook
router.get('/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: `${process.env.CLIENT_URL}/login`, session: false }),
    (req, res) => {
        const payload = { user: { id: req.user._id } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        // Redirection vers frontend avec token dans le hash URL
        res.redirect(`${process.env.CLIENT_URL}/login#token=${token}`);
    }
);

module.exports = router;
