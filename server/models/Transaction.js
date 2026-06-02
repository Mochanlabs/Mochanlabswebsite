const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, default: '', trim: true },
  date: { type: Date, default: Date.now },
  referenceId: { type: String, default: '', trim: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  lineItemIndex: { type: Number, default: null },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
