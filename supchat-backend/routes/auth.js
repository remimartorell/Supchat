// supchat-backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route    POST /api/auth/register
// @desc     Register user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Vérif existence
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Création
        user = new User({
            name,
            email,
            password: await bcrypt.hash(password, 10),
        });
        await user.save();

        // Générer token
        const payload = { user: { id: user._id } };
        const token = jwt.sign(payload, 'secret', { expiresIn: '8h' });

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route    POST /api/auth/login
// @desc     Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Trouver l'user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Vérifier password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Générer token
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
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route    GET /api/auth/user
// @desc     Get current user
// @access   Private
router.get('/user', auth, async (req, res) => {
    try {
        // req.user est défini par le middleware 'auth'
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/auth/allUsers
// @desc    Récupère la liste de tous les utilisateurs
// @access  Privé
router.get('/allUsers', auth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;