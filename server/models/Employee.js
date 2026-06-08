const mongoose = require('mongoose');

const letterSchema = new mongoose.Schema({
  letterType: { type: String, enum: ['offer', 'experience', 'relieving', 'salary'], required: true },
  fileName: String,
  generatedDate: { type: Date, default: Date.now }
});

const employeeSchema = new mongoose.Schema({
  // Personal Information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  dob: Date,
  permanentAddress: String,
  communicationAddress: String,
  skills: String,

  // Employment Information
  employeeCode: { type: String, unique: true, sparse: true },
  position: String,
  department: String,
  reportingManager: String,
  employmentType: { type: String, enum: ['full-time', 'contract', 'intern', 'trainee'], default: 'full-time' },
  dateOfJoining: Date,
  workLocation: String,
  officialEmail: String,
  ctc: Number,
  probationPeriod: String,

  // Status
  isActive: { type: Boolean, default: true },
  dateOfRelieving: Date,
  relievingComments: String,
  generatedLetters: [letterSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Employee', employeeSchema);
