// supchat-backend/models/Call.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const CallSchema = new Schema({
    caller:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    callee:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:     { type: String, enum: ['audio','video'], required: true },
    startedAt:{ type: Date, default: Date.now },
    endedAt:  { type: Date }
});

module.exports = model('Call', CallSchema);
