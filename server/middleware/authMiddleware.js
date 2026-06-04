const logger = require('../services/logger');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = req.cookies?.adminToken || authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided'
      });
    }

    // Decode token to get username (token is base64 encoded username)
    const username = Buffer.from(token, 'base64').toString();
    const expectedUsername = process.env.ADMIN_USERNAME;

    if (username !== expectedUsername) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token'
      });
    }

    // Token is valid, attach to request
    req.adminUser = username;
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
};

module.exports = authMiddleware;
