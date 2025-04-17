// models/Meeting.js
const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    startTime: { type: Date, required: true },
    // Ajoutez d'autres champs si besoin, par exemple description, participants, etc.
});

module.exports = mongoose.model('Meeting', MeetingSchema);
