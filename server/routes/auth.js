const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Mochan@2024';

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!username || !password) {
      logger.warn('Login attempt with missing credentials', { ip: clientIP });
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      logger.info('Admin login successful', { username, ip: clientIP, timestamp: new Date().toISOString() });
      return res.json({
        success: true,
        message: 'Login successful',
        token: Buffer.from(username).toString('base64')
      });
    } else {
      logger.warn('Failed login attempt', { username, ip: clientIP });
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
  } catch (error) {
    logger.error('Error during login', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
