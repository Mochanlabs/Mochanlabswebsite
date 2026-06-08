const mongoose = require('mongoose');

const employeePositionHistorySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  position: { type: String, required: true },
  department: { type: String, required: true },
  ctc: { type: Number, required: true },
  effectiveDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmployeePositionHistory', employeePositionHistorySchema);
