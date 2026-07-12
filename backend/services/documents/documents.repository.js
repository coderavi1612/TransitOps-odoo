const { supabaseAdmin } = require('../../shared/supabase');

class DocumentsRepository {
  async getDocuments(filters = {}) {
    const { document_type, uploaded_by, page = 1, limit = 1000 } = filters;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin.from('documents').select('*', { count: 'exact' }).is('deleted_at', null);

    if (document_type && document_type !== 'All') {
      query = query.eq('document_type', document_type);
    }
    if (uploaded_by) {
      query = query.eq('uploaded_by', uploaded_by);
    }

    query = query.order('created_at', { ascending: false });

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    return query;
  }

  async getDocumentById(id) {
    return supabaseAdmin.from('documents').select('*').eq('id', id).is('deleted_at', null).single();
  }

  async createDocument(data) {
    return supabaseAdmin.from('documents').insert(data).select().single();
  }

  async softDeleteDocument(id) {
    return supabaseAdmin.from('documents').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  }
}

module.exports = new DocumentsRepository();
