const mongoose = require('mongoose');

const letterSchema = new mongoose.Schema({
  letterType: { type: String, enum: ['offer', 'experience', 'relieving', 'salary'], required: true },
  fileName: String,
  generatedDate: { type: Date, default: Date.now }
});

const employeeSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  dob: Date,
  address: { type: String, required: true },
  position: String,
  department: String,
  dateOfJoining: Date,
  employeeCode: { type: String, unique: true, sparse: true },
  skills: String,
  generatedLetters: [letterSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Employee', employeeSchema);
