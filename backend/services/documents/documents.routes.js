const express = require('express');
const multer = require('multer');
const { supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const s3 = new S3Client({
  endpoint: process.env.CF_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
  },
  region: 'auto',
});

const DOCUMENT_TYPE_NAMES = {
  delivery_challan: 'Delivery Challan',
  invoice: 'Invoice',
  bol: 'Bill of Lading (BoL)',
  pod: 'Proof of Delivery (POD)',
  eway_bill: 'E-way Bill (India)',
  vehicle_rc: 'Vehicle Registration Certificate (RC)',
  driver_license: "Driver's License",
  insurance: 'Insurance Certificate',
  puc: 'Pollution Under Control (PUC) Certificate',
  permit: 'Permit Documents',
  goods_receipt: 'Goods Receipt (GR)',
  trip_sheet: 'Trip Sheet',
};

function formatBytes(bytes) {
  if (!bytes) return '';
  const numBytes = Number(bytes);
  if (numBytes < 1024) return `${numBytes} B`;
  if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
  return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDocumentDto(row) {
  return {
    id: row.id,
    typeId: row.document_type,
    typeName: DOCUMENT_TYPE_NAMES[row.document_type] || row.document_type,
    fileName: row.file_name,
    reference: row.document_number || '',
    notes: row.notes || '',
    uploadedAt: row.created_at,
    size: formatBytes(row.file_size),
    status: row.status || 'Filed',
    mimeType: row.mime_type,
    fileUrl: row.file_url,
  };
}

// GET /api/documents — List filed documents
router.get('/', authenticate, async (req, res) => {
  try {
    const { document_type } = req.query;
    let query = supabaseAdmin.from('documents').select('*');

    if (document_type && document_type !== 'All') {
      query = query.eq('document_type', document_type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const documents = (data || []).map(toDocumentDto);
    res.json({ documents, count: documents.length });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents — File document metadata and optional upload details
router.post(
  '/',
  authenticate,
  requireRole('fleet_manager', 'safety_officer', 'financial_analyst', 'admin'),
  upload.single('file'),
  async (req, res) => {
    const file = req.file;
    const { document_type, document_number, notes } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'file is required' });
    }
    if (!document_type) {
      return res.status(400).json({ error: 'document_type is required' });
    }

    const key = `${Date.now()}-${file.originalname}`;

    try {
      // 1. Upload file to Cloudflare R2
      const uploadParams = {
        Bucket: process.env.CF_R2_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await s3.send(new PutObjectCommand(uploadParams));

      // Construct file access URL
      const fileUrl = `${process.env.CF_R2_ENDPOINT}/${process.env.CF_R2_BUCKET_NAME}/${key}`;

      // 2. Insert into documents table
      const { data, error } = await supabaseAdmin
        .from('documents')
        .insert({
          document_type,
          document_number: document_number || null,
          notes: notes || null,
          file_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
          file_url: fileUrl,
          uploaded_by: req.user.id,
          status: 'Filed',
        })
        .select()
        .single();

      if (error) {
        // Rollback R2 upload if DB insert fails
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: process.env.CF_R2_BUCKET_NAME, Key: key }));
        } catch (rollbackErr) {
          console.error('R2 Rollback failed:', rollbackErr);
        }
        return res.status(400).json({ error: error.message });
      }

      res.status(201).json(toDocumentDto(data));
    } catch (err) {
      console.error('Create document error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/documents/:id — Delete document metadata and its R2 file
router.delete(
  '/:id',
  authenticate,
  requireRole('fleet_manager', 'safety_officer', 'financial_analyst', 'admin'),
  async (req, res) => {
    try {
      // 1. Fetch document to get file_url
      const { data: document, error: fetchError } = await supabaseAdmin
        .from('documents')
        .select('file_url')
        .eq('id', req.params.id)
        .single();

      if (fetchError || !document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // 2. Delete document from database first
      const { error: deleteError } = await supabaseAdmin
        .from('documents')
        .delete()
        .eq('id', req.params.id);

      if (deleteError) {
        return res.status(400).json({ error: deleteError.message });
      }

      // 3. Delete file from Cloudflare R2 if it exists
      if (document.file_url) {
        try {
          const parts = document.file_url.split('/');
          const key = parts[parts.length - 1];
          await s3.send(
            new DeleteObjectCommand({
              Bucket: process.env.CF_R2_BUCKET_NAME,
              Key: key,
            })
          );
        } catch (r2Err) {
          console.error('Failed to delete file from Cloudflare R2:', r2Err);
        }
      }

      res.json({ message: 'Document deleted' });
    } catch (err) {
      console.error('Delete document error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/documents/:id/download — Download document file from R2
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.file_url) {
      return res.status(404).json({ error: 'Document file URL not found' });
    }

    const parts = document.file_url.split('/');
    const key = parts[parts.length - 1];

    const command = new GetObjectCommand({
      Bucket: process.env.CF_R2_BUCKET_NAME,
      Key: key,
    });

    const response = await s3.send(command);

    res.setHeader('Content-Type', document.mime_type || response.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.file_name)}"`);
    if (document.file_size) {
      res.setHeader('Content-Length', document.file_size);
    }

    if (response.Body && typeof response.Body.pipe === 'function') {
      response.Body.pipe(res);
    } else if (response.Body) {
      const data = await response.Body.transformToByteArray();
      res.send(Buffer.from(data));
    } else {
      res.status(404).json({ error: 'Empty file body' });
    }
  } catch (err) {
    console.error('Download document error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
