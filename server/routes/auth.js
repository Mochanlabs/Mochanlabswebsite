const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const OTP = require('../models/OTP');
const { sendOTP } = require('../services/emailService');
const logger = require('../services/logger');

const ADMIN_EMAIL = 'mochanlabs@gmail.com';

const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => process.env.NODE_ENV !== 'production',
  keyGenerator: (req, res) => req.ip || 'unknown'
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many verification attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => process.env.NODE_ENV !== 'production',
  keyGenerator: (req, res) => req.ip || 'unknown'
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

router.post('/send-otp', otpRequestLimiter, async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    logger.info('OTP request received', { ip: clientIP });

    const otp = generateOTP();

    await OTP.deleteMany({ email: ADMIN_EMAIL });

    const otpRecord = new OTP({
      email: ADMIN_EMAIL,
      code: otp
    });

    await otpRecord.save();
    const emailSent = await sendOTP(ADMIN_EMAIL, otp);

    if (!emailSent) {
      logger.error('Failed to send OTP email', { ip: clientIP });
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please check server configuration.'
      });
    }

    logger.info('OTP sent successfully', { email: ADMIN_EMAIL, ip: clientIP });
    res.json({
      success: true,
      message: 'OTP sent to mochanlabs@gmail.com'
    });
  } catch (error) {
    logger.error('Error sending OTP', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post('/verify-otp', otpVerifyLimiter, async (req, res) => {
  try {
    const { otp } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!otp || otp.length !== 6) {
      logger.warn('Invalid OTP format attempted', { ip: clientIP, otpLength: otp?.length });
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format'
      });
    }

    const otpRecord = await OTP.findOne({
      email: ADMIN_EMAIL,
      code: otp
    });

    if (!otpRecord) {
      logger.warn('Invalid or expired OTP attempted', { email: ADMIN_EMAIL, ip: clientIP });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    logger.info('Admin login successful', { email: ADMIN_EMAIL, ip: clientIP, timestamp: new Date().toISOString() });

    res.json({
      success: true,
      message: 'OTP verified successfully',
      token: Buffer.from(ADMIN_EMAIL).toString('base64')
    });
  } catch (error) {
    logger.error('Error verifying OTP', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
