const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  ip:        { type: String, required: true, unique: true },
  userAgent: { type: String, default: '' },
  country:   { type: String, default: 'Unknown' },
  city:      { type: String, default: '' },
  visits:    { type: Number, default: 1 },
  pages:     [{ type: String }],
  lastSeen:  { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Visitor', visitorSchema);
