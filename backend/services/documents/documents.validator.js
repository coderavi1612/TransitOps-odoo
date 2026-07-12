const { z } = require('zod');
const { validate } = require('../../shared/middleware/validate');

const listDocumentsSchema = z.object({
  query: z.object({
    document_type: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

const createDocumentSchema = z.object({
  body: z.object({
    document_type: z.string().min(1),
    document_number: z.string().optional(),
    notes: z.string().optional(),
  }),
});

module.exports = {
  validateListDocuments: validate(listDocumentsSchema),
  validateCreateDocument: validate(createDocumentSchema),
};
