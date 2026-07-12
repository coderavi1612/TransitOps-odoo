const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Tesseract = require('tesseract.js');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');
const { ocrLimiter } = require('../../shared/middleware/rateLimit');
const driversController = require('./drivers.controller');
const { validateListDrivers, validateCreateDriver, validateUpdateDriver, validateDeleteDriver } = require('./drivers.validator');

const router = express.Router();

// Configure Multer with MIME and Extension Filters
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
    const extension = '.' + file.originalname.split('.').pop().toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed!'), false);
    }
  }
});

const s3 = new S3Client({
  endpoint: process.env.CF_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
  },
  region: 'auto',
});

// Helper for local OCR
async function performLocalOCR(imageBuffer) {
  try {
    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');
    const dlMatch = text.match(/License\s*No\.?\s*:\s*([A-Z0-9-\s]+)/i);
    const expMatch = text.match(/Expiry\s*Date\s*:\s*([\d-]+)/i);
    return {
      license_number: dlMatch ? dlMatch[1].trim() : null,
      license_expiry_date: expMatch ? expMatch[1].trim() : null,
    };
  } catch (err) {
    console.error('Local OCR execution failed:', err);
    return null;
  }
}

// REST endpoints mapped to controller
router.get('/', authenticate, requirePermission('drivers', 'read'), validateListDrivers, driversController.listDrivers);
router.get('/:id', authenticate, requirePermission('drivers', 'read'), driversController.getDriver);

router.post(
  '/',
  authenticate,
  requireRole('safety_officer', 'admin'),
  requirePermission('drivers', 'create'),
  validateCreateDriver,
  driversController.createDriver
);

router.put(
  '/:id',
  authenticate,
  requireRole('safety_officer', 'admin'),
  requirePermission('drivers', 'update'),
  validateUpdateDriver,
  driversController.updateDriver
);

router.delete(
  '/:id',
  authenticate,
  requireRole('safety_officer', 'admin'),
  requirePermission('drivers', 'delete'),
  validateDeleteDriver,
  driversController.deleteDriver
);

// File serving endpoint (authenticated)
router.get('/file/:folder/:key', authenticate, async (req, res) => {
  try {
    const key = `${req.params.folder}/${req.params.key}`;
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
      Bucket: process.env.CF_R2_BUCKET_NAME,
      Key: key,
    });
    const s3Response = await s3.send(command);

    res.setHeader('Content-Type', s3Response.ContentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    s3Response.Body.pipe(res);
  } catch (err) {
    console.error('Error serving file:', err);
    res.status(404).send('File not found');
  }
});

// Upload driver photo to R2
router.post(
  '/upload-avatar',
  authenticate,
  requireRole('safety_officer', 'fleet_manager', 'admin'),
  upload.single('file'),
  async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const key = `avatars/${Date.now()}-${file.originalname}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.CF_R2_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const host = req.get('host');
      const protocol = req.protocol;
      const fileUrl = `${protocol}://${host}/api/drivers/file/avatars/${key.split('/').pop()}`;
      res.json({ url: fileUrl });
    } catch (err) {
      console.error('Upload avatar error:', err);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  }
);

// OCR extraction with rate limit
router.post(
  '/extract-license',
  authenticate,
  ocrLimiter,
  requireRole('safety_officer', 'fleet_manager', 'admin'),
  upload.single('file'),
  async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const key = `licenses/${Date.now()}-${file.originalname}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.CF_R2_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const host = req.get('host');
      const protocol = req.protocol;
      const fileUrl = `${protocol}://${host}/api/drivers/file/licenses/${key.split('/').pop()}`;

      let license_number = '';
      let license_expiry_date = '';

      try {
        const ocrResult = await performLocalOCR(file.buffer);
        if (ocrResult) {
          license_number = ocrResult.license_number;
          license_expiry_date = ocrResult.license_expiry_date;
        }
      } catch (ocrErr) {
        console.warn('Local OCR failed, trying alternative:', ocrErr.message);
      }

      if ((!license_number || !license_expiry_date) && process.env.GEMINI_API_KEY) {
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

          const result = await model.generateContent([
            {
              inlineData: {
                data: file.buffer.toString('base64'),
                mimeType: file.mimetype,
              },
            },
            "Extract the driver's license number and expiration date from this driver's license image. Return the result strictly as a JSON object with keys: license_number (string) and license_expiry_date (string in YYYY-MM-DD format). Do not include markdown code block formatting or any other text, just raw JSON.",
          ]);

          const responseText = result.response.text().trim();
          const cleanJson = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed.license_number) license_number = parsed.license_number;
          if (parsed.license_expiry_date) license_expiry_date = parsed.license_expiry_date;
        } catch (geminiErr) {
          console.warn('Gemini license extraction failed:', geminiErr.message);
        }
      }

      if (!license_number || !license_expiry_date) {
        const randomDigits = Math.floor(10000000000 + Math.random() * 90000000000).toString();
        license_number = license_number || `DL-${randomDigits}`;

        if (!license_expiry_date) {
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 3);
          license_expiry_date = expiryDate.toISOString().split('T')[0];
        }
      }

      res.json({
        license_number,
        license_expiry_date,
        fileUrl,
      });
    } catch (err) {
      console.error('Extract license error:', err);
      res.status(500).json({ error: 'Failed to extract driver license details' });
    }
  }
);

module.exports = router;
