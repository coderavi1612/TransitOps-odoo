const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login or signup attempts, please try again after 15 minutes' },
});

const ocrLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 OCR upload requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'OCR upload limit exceeded, please try again after an hour' },
});

module.exports = { authLimiter, ocrLimiter };
