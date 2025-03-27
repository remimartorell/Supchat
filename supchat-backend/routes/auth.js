/* supchat-backend/routes/auth.js */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const auth = require('../middleware/auth');
const User = require('../models/User');
const transporter = require('../config/email');

// GridFS
const { GridFsStorage } = require('multer-gridfs-storage');
const multer = require('multer');

const storage = new GridFsStorage({
    url: process.env.MONGO_URI,
    file: (req, file) => {
        return {
            filename: 'avatar-' + Date.now() + path.extname(file.originalname),
            bucketName: 'avatars',
        };
    },
});
const uploadAvatar = multer({ storage });
// =========================
// 1) REGISTER AVEC VERIFICATION PAR EMAIL
// =========================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Vérifier si l'utilisateur existe déjà
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        // Créer un nouvel utilisateur avec isVerified = false
        user = new User({
            name,
            email,
            password, // passez le mot de passe en clair, le hook va le hacher
            isVerified: false,
        });
        // Générer un token de vérification
        const verificationToken = crypto.randomBytes(20).toString('hex');
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = Date.now() + 24 * 3600 * 1000; // 24 heures
        await user.save();
        // Construire l'URL de vérification en utilisant BACK_URL (port 3000)
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
        await transporter.sendMail(mailOptions);
        // Ne retourne pas de JWT, on demande à l'utilisateur de valider son email
        return res.json({
            msg: 'Inscription réussie, veuillez vérifier votre e-mail pour activer votre compte.',
        });
    } catch (err) {
        console.error('Erreur register :', err);
        res.status(500).send('Server error');
    }
});

// =========================
// 2) LOGIN
// =========================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Trouver l'utilisateur par email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        // Vérifier que l'utilisateur a validé son email
        if (!user.isVerified) {
            return res.status(403).json({ msg: 'Votre compte n\'est pas activé. Veuillez vérifier vos emails.' });
        }
        // Vérifier le mot de passe
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        // Générer un JWT pour la session
        const payload = { user: { id: user._id } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (err) {
        console.error('Erreur login :', err);
        res.status(500).send('Server error');
    }
});

// =========================
// 3) GET CURRENT USER
// =========================
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('Erreur get user:', err);
        res.status(500).send('Server error');
    }
});

// =========================
// 4) GET ALL USERS
// =========================
router.get('/allUsers', auth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error('Erreur allUsers :', err);
        res.status(500).send('Server error');
    }
});

// =========================
// 5) UPDATE PROFILE
// =========================
router.put('/update', auth, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Utilisateur introuvable' });
        }

        const { name, email, oldPassword, newPassword, confirmPassword } = req.body;

        if (name) user.name = name;
        if (email) user.email = email;

        if (newPassword) {
            if (!oldPassword) {
                return res.status(400).json({ msg: 'Ancien mot de passe requis' });
            }
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Ancien mot de passe incorrect' });
            }
            if (newPassword !== confirmPassword) {
                return res.status(400).json({ msg: 'Le nouveau mot de passe et la confirmation ne correspondent pas' });
            }
            user.password = newPassword;
        }

        if (req.file) {
            user.avatarFileId = req.file.id; // ObjectId de GridFS
        }

        await user.save();

        res.json({ msg: 'Profil mis à jour', user });
    } catch (err) {
        console.error('Erreur update user :', err);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});
// =========================
// 6) VERIFY EMAIL
// =========================
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ msg: 'No token provided' });
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() },
        });
        if (!user) return res.status(400).json({ msg: 'Invalid or expired token' });
        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        return res.send(`
            <h1>Votre compte est vérifié !</h1>
            <p>Vous pouvez maintenant vous connecter : <a href="${process.env.CLIENT_URL}/login">Connexion</a></p>
        `);
    } catch (err) {
        console.error('Erreur verify-email :', err);
        res.status(500).json({ msg: 'Server error' });
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
            return res.status(200).json({ msg: 'If that email exists, a password reset was sent.' });
        }
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600 * 1000; // 1 heure
        await user.save();
        const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
        const mailOptions = {
            from: 'Support SupChat <contact@supchat.info>',
            to: user.email,
            subject: 'Réinitialiser votre mot de passe',
            html: `
                <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
                <a href="${resetURL}">Choisir un nouveau mot de passe</a>
                <p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
            `,
        };
        await transporter.sendMail(mailOptions);
        return res.status(200).json({ msg: 'Email de réinitialisation de mot de passe envoyé. Vérifiez votre boîte de réception !' });
    } catch (err) {
        console.error('Erreur forgot-password :', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// =========================
// 8) RESET PASSWORD
// =========================
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({ msg: 'Missing data' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ msg: 'Passwords do not match' });
        }
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({ msg: 'Token invalid or expired' });
        }
        user.password = newPassword; // sera hashé par le hook pre('save')
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        const mailOptions = {
            from: 'Support SupChat <contact@supchat.info>',
            to: user.email,
            subject: 'Votre mot de passe a été réinitialisé',
            html: `
                <p>Bonjour ${user.name},</p>
                <p>Votre mot de passe a été réinitialisé avec succès.</p>
                <p>Si vous n'êtes pas à l'origine de cette action, veuillez contacter immédiatement notre support.</p>
            `,
        };
        await transporter.sendMail(mailOptions);
        return res.status(200).json({ msg: 'Password has been reset successfully' });
    } catch (err) {
        console.error('Erreur reset-password:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
