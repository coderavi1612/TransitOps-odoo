const documentsRepository = require('./documents.repository');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

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

class DocumentsService {
  formatBytes(bytes) {
    if (!bytes) return '';
    const numBytes = Number(bytes);
    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
    return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  toDocumentDto(row) {
    return {
      id: row.id,
      typeId: row.document_type,
      typeName: DOCUMENT_TYPE_NAMES[row.document_type] || row.document_type,
      fileName: row.file_name,
      reference: row.document_number || '',
      notes: row.notes || '',
      uploadedAt: row.created_at,
      size: this.formatBytes(row.file_size),
      status: row.status || 'Filed',
      mimeType: row.mime_type,
      fileUrl: row.file_url,
    };
  }

  async listDocuments(filters, userRoles, userId) {
    // Row ownership: Drivers can only view documents they uploaded
    if (userRoles.includes('driver')) {
      filters.uploaded_by = userId;
    }

    const { data, error } = await documentsRepository.getDocuments(filters);
    if (error) throw new Error(error.message);

    const documents = (data || []).map((row) => this.toDocumentDto(row));
    return { documents, count: documents.length };
  }

  async getDocument(id, userRoles, userId) {
    const { data, error } = await documentsRepository.getDocumentById(id);
    if (error || !data) throw new Error('Document not found');

    // Row ownership check for drivers
    if (userRoles.includes('driver') && data.uploaded_by !== userId) {
      throw new Error('Access denied: You can only view your own documents');
    }

    return this.toDocumentDto(data);
  }

  async createDocument(file, body, userId) {
    const { document_type, document_number, notes } = body;
    const key = `${Date.now()}-${file.originalname}`;

    // Upload file to Cloudflare R2
    const uploadParams = {
      Bucket: process.env.CF_R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
    await s3.send(new PutObjectCommand(uploadParams));

    const fileUrl = `${process.env.CF_R2_ENDPOINT}/${process.env.CF_R2_BUCKET_NAME}/${key}`;

    const { data, error } = await documentsRepository.createDocument({
      document_type,
      document_number: document_number || null,
      notes: notes || null,
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
      file_url: fileUrl,
      uploaded_by: userId,
      status: 'Filed',
    });

    if (error) {
      // Rollback R2 upload if database insert fails
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.CF_R2_BUCKET_NAME, Key: key }));
      } catch (rollbackErr) {
        console.error('R2 Rollback failed:', rollbackErr);
      }
      throw new Error(error.message);
    }

    return this.toDocumentDto(data);
  }

  async deleteDocument(id, userRoles, userId) {
    const { data: document, error: fetchErr } = await documentsRepository.getDocumentById(id);
    if (fetchErr || !document) throw new Error('Document not found');

    // Row ownership check for drivers
    if (userRoles.includes('driver') && document.uploaded_by !== userId) {
      throw new Error('Access denied: You can only delete your own documents');
    }

    const { error } = await documentsRepository.softDeleteDocument(id);
    if (error) throw new Error(error.message);

    if (document.file_url) {
      const key = document.file_url.split('/').pop();
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.CF_R2_BUCKET_NAME, Key: key }));
      } catch (deleteError) {
        console.error('Failed to remove deleted document from R2:', deleteError.message);
      }
    }

    return { message: 'Document deleted' };
  }

  async downloadDocument(id, userRoles, userId) {
    const { data: document, error } = await documentsRepository.getDocumentById(id);
    if (error || !document) throw new Error('Document not found');

    // Row ownership check for drivers
    if (userRoles.includes('driver') && document.uploaded_by !== userId) {
      throw new Error('Access denied: You can only download your own documents');
    }

    if (!document.file_url) throw new Error('Document file URL not found');

    const parts = document.file_url.split('/');
    const key = parts[parts.length - 1];

    const command = new GetObjectCommand({
      Bucket: process.env.CF_R2_BUCKET_NAME,
      Key: key,
    });
    const s3Response = await s3.send(command);

    return {
      s3Response,
      fileName: document.file_name,
      fileSize: document.file_size,
      mimeType: document.mime_type,
    };
  }
}

module.exports = new DocumentsService();
