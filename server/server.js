require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const path      = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the static website files from the project root
app.use(express.static(path.join(__dirname, '..')));

// API routes
app.use('/api/invoices', require('./routes/invoices'));

// Fallback: serve index.html for any non-API, non-static route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const PORT       = process.env.PORT || 3000;
const MONGO_URI  = process.env.MONGODB_URI;
console.log("URI FROM ENV:", process.env.MONGODB_URI);
if (!MONGO_URI) {
  console.warn('⚠️  WARNING: MONGODB_URI is not set in server/.env');
}

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('✅ MongoDB connected');
    })
    .catch(err => {
      console.error('❌ MongoDB connection failed:', err.message);
      console.warn('⚠️  Continuing without MongoDB...');
    });
}

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📱 Admin dashboard → http://localhost:${PORT}/admin/dashboard.html`);
  console.log(`🌐 Website → http://localhost:${PORT}`);
});
