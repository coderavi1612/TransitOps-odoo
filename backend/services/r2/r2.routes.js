const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { supabaseAdmin: supabase } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole } = require('../../shared/middleware/rbac');

const router = express.Router();

// Configure Multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Initialize S3 Client for Cloudflare R2
const s3 = new S3Client({
  endpoint: process.env.CF_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
  },
  region: 'auto',
});

// POST /api/r2/upload — Upload file to R2 and create vehicle document
router.post(
  '/upload',
  authenticate,
  requireRole('fleet_manager', 'safety_officer', 'admin'),
  upload.single('file'),
  async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      vehicle_id,
      document_type,
      document_number,
      issue_date,
      expiry_date,
    } = req.body;

    if (!vehicle_id || !document_type) {
      return res.status(400).json({ error: 'vehicle_id and document_type are required' });
    }

    const validDocumentTypes = ['Registration', 'Insurance', 'Permit', 'Inspection', 'Other'];
    if (!validDocumentTypes.includes(document_type)) {
      return res.status(400).json({
        error: `Invalid document_type. Must be one of: ${validDocumentTypes.join(', ')}`,
      });
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

      // 2. Insert into ir_attachment
      const { data: attachment, error: attachError } = await supabase
        .from('ir_attachment')
        .insert({
          name: file.originalname,
          url: fileUrl,
          mimetype: file.mimetype,
          file_size: file.size,
        })
        .select()
        .single();

      if (attachError) {
        throw new Error(`Failed to create ir_attachment: ${attachError.message}`);
      }

      // 3. Insert into transit_ops_vehicle_document
      const { data: document, error: docError } = await supabase
        .from('transit_ops_vehicle_document')
        .insert({
          vehicle_id,
          document_type,
          document_number: document_number || null,
          issue_date: issue_date || null,
          expiry_date: expiry_date || null,
          attachment_id: attachment.id,
          active: true,
        })
        .select()
        .single();

      if (docError) {
        // Rollback R2 upload and attachment if document insertion fails
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: process.env.CF_R2_BUCKET_NAME, Key: key }));
          await supabase.from('ir_attachment').delete().eq('id', attachment.id);
        } catch (rollbackErr) {
          console.error('Rollback failed:', rollbackErr);
        }
        throw new Error(`Failed to create vehicle document: ${docError.message}`);
      }

      res.status(201).json({
        message: 'File uploaded and document created successfully',
        document,
        attachment,
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message || 'File upload failed' });
    }
  }
);

// DELETE /api/r2/documents/:id — Delete a vehicle document and its R2 file/attachment
router.delete(
  '/documents/:id',
  authenticate,
  requireRole('fleet_manager', 'safety_officer', 'admin'),
  async (req, res) => {
    try {
      // 1. Fetch document and attachment details
      const { data: document, error: docError } = await supabase
        .from('transit_ops_vehicle_document')
        .select('*, ir_attachment(*)')
        .eq('id', req.params.id)
        .single();

      if (docError || !document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const attachment = document.ir_attachment;

      // 2. Delete document from transit_ops_vehicle_document
      const { error: deleteDocError } = await supabase
        .from('transit_ops_vehicle_document')
        .delete()
        .eq('id', req.params.id);

      if (deleteDocError) {
        throw new Error(`Failed to delete document: ${deleteDocError.message}`);
      }

      // 3. Delete attachment from ir_attachment and R2 if exists
      if (attachment) {
        // Delete from ir_attachment table
        const { error: deleteAttachError } = await supabase
          .from('ir_attachment')
          .delete()
          .eq('id', attachment.id);

        if (deleteAttachError) {
          console.error('Failed to delete ir_attachment record:', deleteAttachError.message);
        }

        // Delete from Cloudflare R2
        try {
          const parts = attachment.url.split('/');
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

      res.json({ message: 'Document and associated attachment deleted successfully' });
    } catch (err) {
      console.error('Delete document error:', err);
      res.status(500).json({ error: err.message || 'Failed to delete document' });
    }
  }
);

module.exports = router;
