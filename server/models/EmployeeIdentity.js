const mongoose = require('mongoose');

const employeeIdentitySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  identityType: {
    type: String,
    enum: ['aadhaar', 'pan', 'driving-license', 'passport', 'voter-id', 'other'],
    required: true
  },
  identityNumber: String,
  documentName: String,
  documentPath: String,
  documentSize: Number,
  uploadDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmployeeIdentity', employeeIdentitySchema);
