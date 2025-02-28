// supchat-backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');
const crypto = require('crypto');
const transporter = require('../config/email');

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
        console.error('Erreur get user :', err);
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
router.put('/update', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, oldPassword, newPassword, confirmPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'Utilisateur introuvable' });
        }

        // Sauvegarder les anciennes valeurs pour comparaison
        const oldName = user.name;
        const oldEmail = user.email;

        let nameChanged = false;
        let emailChanged = false;
        let passwordChanged = false;

        // Mettre à jour pseudo
        if (name && name !== user.name) {
            user.name = name;
            nameChanged = true;
        }
        // Mettre à jour email
        if (email && email !== user.email) {
            user.email = email;
            emailChanged = true;
        }
        // Logique de changement de mot de passe
        if (newPassword && newPassword.trim() !== '') {
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
            user.password = newPassword; // Le hook pre('save') s'occupe du hachage
            passwordChanged = true;
        }

        await user.save();

        // Envoi des emails selon les changements

        // Si le pseudo a changé, envoyer un email de confirmation au même email
        if (nameChanged) {
            const mailOptionsName = {
                from: 'Support SupChat <contact@supchat.info>',
                to: user.email,
                subject: 'Changement de pseudo',
                html: `
                    <p>Bonjour ${user.name},</p>
                    <p>Votre pseudo a été modifié avec succès. Votre nouveau pseudo est : <strong>${user.name}</strong>.</p>
                `,
            };
            await transporter.sendMail(mailOptionsName);
        }

        // Si l'email a changé, envoyer deux emails :
        if (emailChanged) {
            // Email à l'ancien email
            const mailOptionsOldEmail = {
                from: 'Support SupChat <contact@supchat.info>',
                to: oldEmail,
                subject: 'Modification de votre adresse email',
                html: `
                    <p>Bonjour,</p>
                    <p>Votre adresse email a été modifiée. Votre nouvelle adresse est : <strong>${user.email}</strong>.</p>
                `,
            };
            await transporter.sendMail(mailOptionsOldEmail);
            // Email au nouveau email
            const mailOptionsNewEmail = {
                from: 'Support SupChat <contact@supchat.info>',
                to: user.email,
                subject: 'Modification de votre adresse email',
                html: `
                    <p>Bonjour,</p>
                    <p>Votre adresse email a été modifiée avec succès. Elle est désormais : <strong>${user.email}</strong>.</p>
                `,
            };
            await transporter.sendMail(mailOptionsNewEmail);
        }

        // Si le mot de passe a changé, envoyer un email de confirmation
        if (passwordChanged) {
            const mailOptionsPassword = {
                from: 'Support SupChat <contact@supchat.info>',
                to: user.email,
                subject: 'Modification de votre mot de passe',
                html: `
                    <p>Bonjour ${user.name},</p>
                    <p>Votre mot de passe a été modifié avec succès.</p>
                `,
            };
            await transporter.sendMail(mailOptionsPassword);
        }

        // On renvoie l'utilisateur mis à jour (sans password)
        const updatedUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
        };
        res.json({ msg: 'Profil mis à jour', user: updatedUser });
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
