const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  desc:   { type: String, default: '' },
  qty:    { type: Number, default: 0 },
  rate:   { type: Number, default: 0 },
  amount: { type: Number, default: 0 }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  number:        { type: String, required: true, unique: true, trim: true },
  date:          { type: String, default: '' },
  due:           { type: String, default: '' },
  status:        { type: String, enum: ['pending', 'paid', 'overdue', 'draft'], default: 'pending' },
  clientName:    { type: String, required: true, trim: true },
  clientCompany: { type: String, default: '' },
  clientEmail:   { type: String, default: '' },
  clientPhone:   { type: String, default: '' },
  clientAddress: { type: String, default: '' },
  items:         { type: [lineItemSchema], default: [] },
  taxPct:        { type: Number, default: 18 },
  discPct:       { type: Number, default: 0 },
  currency:      { type: String, default: '₹' },
  notes:         { type: String, default: '' },
  terms:         { type: String, default: '' },
  subtotal:      { type: Number, default: 0 },
  discountAmt:   { type: Number, default: 0 },
  taxAmt:        { type: Number, default: 0 },
  grandTotal:    { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
