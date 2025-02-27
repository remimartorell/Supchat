// supchat-backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');

// =========================
// 1) REGISTER
// =========================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Vérifier si un utilisateur avec cet email existe déjà
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Créer l'utilisateur (non haché : le hook Mongoose fera le hash)
        user = new User({ name, email, password });
        await user.save();

        // Générer le token
        const payload = { user: { id: user._id } };
        const token = jwt.sign(payload, 'secret', { expiresIn: '8h' });

        res.json({ token });
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
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = { user: { id: user._id } };
        const token = jwt.sign(payload, 'secret', { expiresIn: '8h' });

        res.json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
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
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
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
        // On récupère potentiellement : name, email
        // ET pour le mot de passe : oldPassword, newPassword, confirmPassword
        const { name, email, oldPassword, newPassword, confirmPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'Utilisateur introuvable' });
        }

        // Mettre à jour pseudo et email si présents
        if (name)  user.name  = name;
        if (email) user.email = email;

        // ==========================
        // LOGIQUE DE CHANGEMENT MDP
        // ==========================
        if (newPassword && newPassword.trim() !== '') {
            // 1) Vérifier si l'utilisateur fournit 'oldPassword'
            if (!oldPassword) {
                return res.status(400).json({ msg: 'Ancien mot de passe requis' });
            }

            // 2) Comparer oldPassword avec le mot de passe actuel
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Ancien mot de passe incorrect' });
            }

            // 3) Vérifier la confirmation
            if (newPassword !== confirmPassword) {
                return res.status(400).json({ msg: 'Le nouveau mot de passe et la confirmation ne correspondent pas' });
            }

            // 4) Assigner le nouveau password
            // => le hook Mongoose "pre('save')" va le hacher
            user.password = newPassword;
        }

        // Sauvegarder => si "user.password" a changé, le hook fera le hash
        await user.save();

        // On renvoie l'utilisateur mis à jour (sans password)
        const updatedUser = {
            _id: user._id,
            name: user.name,
            email: user.email
        };
        res.json({ msg: 'Profil mis à jour', user: updatedUser });

    } catch (err) {
        console.error('Erreur update user :', err);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

module.exports = router;
