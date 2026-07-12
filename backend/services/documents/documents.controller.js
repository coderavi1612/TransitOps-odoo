const documentsService = require('./documents.service');
const response = require('../../shared/utils/response');

class DocumentsController {
  async listDocuments(req, res) {
    try {
      const filters = req.query;
      const data = await documentsService.listDocuments(filters, req.userRoles || [], req.user.id);
      return response.success(res, data);
    } catch (err) {
      console.error('List documents error:', err);
      return response.error(res, err.message, 500);
    }
  }

  async getDocument(req, res) {
    try {
      const data = await documentsService.getDocument(req.params.id, req.userRoles || [], req.user.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Get document error:', err);
      const isNotFound = err.message === 'Document not found';
      return response.error(res, err.message, isNotFound ? 404 : 403);
    }
  }

  async createDocument(req, res) {
    try {
      const file = req.file;
      if (!file) {
        return response.error(res, 'file is required', 400);
      }
      const data = await documentsService.createDocument(file, req.body, req.user.id);
      return response.success(res, data, 201);
    } catch (err) {
      console.error('Create document error:', err);
      return response.error(res, err.message, 400);
    }
  }

  async deleteDocument(req, res) {
    try {
      const data = await documentsService.deleteDocument(req.params.id, req.userRoles || [], req.user.id);
      return response.success(res, data);
    } catch (err) {
      console.error('Delete document error:', err);
      const isNotFound = err.message === 'Document not found';
      return response.error(res, err.message, isNotFound ? 404 : 403);
    }
  }

  async downloadDocument(req, res) {
    try {
      const { s3Response, fileName, fileSize, mimeType } = await documentsService.downloadDocument(req.params.id, req.userRoles || [], req.user.id);

      res.setHeader('Content-Type', mimeType || s3Response.ContentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      if (fileSize) {
        res.setHeader('Content-Length', fileSize);
      }

      if (s3Response.Body && typeof s3Response.Body.pipe === 'function') {
        s3Response.Body.pipe(res);
      } else if (s3Response.Body) {
        const bytes = await s3Response.Body.transformToByteArray();
        res.send(Buffer.from(bytes));
      } else {
        return response.error(res, 'Empty file body', 404);
      }
    } catch (err) {
      console.error('Download document error:', err);
      const isNotFound = err.message === 'Document not found';
      return response.error(res, err.message, isNotFound ? 404 : 403);
    }
  }
}

module.exports = new DocumentsController();
