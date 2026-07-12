const express = require('express');
const multer = require('multer');
const documentsController = require('./documents.controller');
const { validateListDocuments, validateCreateDocument } = require('./documents.validator');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
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

router.get('/', authenticate, validateListDocuments, documentsController.listDocuments);
router.get('/:id', authenticate, documentsController.getDocument);

router.post(
  '/',
  authenticate,
  requireRole('fleet_manager', 'safety_officer', 'financial_analyst', 'admin'),
  upload.single('file'),
  validateCreateDocument,
  documentsController.createDocument
);

router.delete(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'safety_officer', 'financial_analyst', 'admin'),
  documentsController.deleteDocument
);

router.get('/:id/download', authenticate, documentsController.downloadDocument);

module.exports = router;
