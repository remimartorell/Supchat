/* supchat-backend/models/User.js */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name:    { type: String, required: true },
    email:   { type: String, required: true, unique: true },
    password:{ type: String, required: true },

    // GridFS : on stocke l'ObjectId du fichier
    avatarFileId: { type: mongoose.Schema.Types.ObjectId, default: null },

    isVerified: { type: Boolean, default: false },
    emailVerificationToken:   { type: String },
    emailVerificationExpires: { type: Date },
    resetPasswordToken:   { type: String },
    resetPasswordExpires: { type: Date },

    date: { type: Date, default: Date.now },
});

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', UserSchema);
