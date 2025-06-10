// supchat-backend/models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name:    { type: String, required: true },
    email:   { type: String, required: true, unique: true },

    // Pour les nouveaux comptes classiques ou OAuth
    password:{ type: String, required: true },

    // IDs OAuth (sparsed pour autoriser les documents sans ces champs)
    facebookId: { type: String, unique: true, sparse: true },
    googleId:   { type: String, unique: true, sparse: true },

    // Avatar (GridFS)
    avatarFileId: { type: String, default: null },

    // Thème utilisateur
    theme: { type: String, default: "dark" },

    // Vérification d’email
    isVerified:               { type: Boolean, default: false },
    emailVerificationToken:   { type: String },
    emailVerificationExpires: { type: Date },

    // Réinitialisation de mot de passe
    resetPasswordToken:   { type: String },
    resetPasswordExpires: { type: Date },

    date: { type: Date, default: Date.now },
});

// Hash du mot de passe avant sauvegarde si modifié
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', UserSchema);
