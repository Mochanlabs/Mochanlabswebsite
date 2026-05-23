const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../services/visitTracker');

// GET /api/analytics/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getAnalytics();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
