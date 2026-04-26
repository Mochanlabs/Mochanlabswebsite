const express  = require('express');
const router   = express.Router();
const Invoice  = require('../models/Invoice');

// GET /api/invoices — all invoices, newest first
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 }).lean();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices — create or update (upsert by invoice number)
router.post('/', async (req, res) => {
  try {
    const doc = await Invoice.findOneAndUpdate(
      { number: req.body.number },
      req.body,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/invoices/:number — delete by invoice number
router.delete('/:number', async (req, res) => {
  try {
    await Invoice.findOneAndDelete({ number: req.params.number });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
