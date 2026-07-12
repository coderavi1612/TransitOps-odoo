import { useEffect, useState, useRef } from 'react';
import { api } from '../utils/api';

const DOCUMENT_TYPES = [
  { id: 'delivery_challan', name: 'Delivery Challan', icon: 'receipt_long', color: 'bg-orange-50 text-orange-800 border-orange-100' },
  { id: 'invoice', name: 'Invoice', icon: 'request_quote', color: 'bg-blue-50 text-blue-800 border-blue-100' },
  { id: 'bol', name: 'Bill of Lading (BoL)', icon: 'sailing', color: 'bg-cyan-50 text-cyan-800 border-cyan-100' },
  { id: 'pod', name: 'Proof of Delivery (POD)', icon: 'verified', color: 'bg-green-50 text-green-800 border-green-100' },
  { id: 'eway_bill', name: 'E-way Bill (India)', icon: 'local_shipping', color: 'bg-amber-50 text-amber-800 border-amber-100' },
  { id: 'vehicle_rc', name: 'Vehicle Registration Certificate (RC)', icon: 'directions_car', color: 'bg-indigo-50 text-indigo-800 border-indigo-100' },
  { id: 'driver_license', name: "Driver's License", icon: 'badge', color: 'bg-purple-50 text-purple-800 border-purple-100' },
  { id: 'insurance', name: 'Insurance Certificate', icon: 'health_and_safety', color: 'bg-rose-50 text-rose-800 border-rose-100' },
  { id: 'puc', name: 'Pollution Under Control (PUC) Certificate', icon: 'eco', color: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
  { id: 'permit', name: 'Permit Documents', icon: 'approval', color: 'bg-yellow-50 text-yellow-800 border-yellow-100' },
  { id: 'goods_receipt', name: 'Goods Receipt (GR)', icon: 'inventory_2', color: 'bg-teal-50 text-teal-800 border-teal-100' },
  { id: 'trip_sheet', name: 'Trip Sheet', icon: 'map', color: 'bg-sky-50 text-sky-800 border-sky-100' },
];

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedType, setSelectedType] = useState(DOCUMENT_TYPES[0].id);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileRef, setFileRef] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const loadDocuments = async () => {
    try {
      setError('');
      const data = await api.get('/api/documents');
      setDocuments(data);
    } catch (err) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const resetUploadForm = () => {
    setShowUploadModal(false);
    setFileName('');
    setSelectedFile(null);
    setFileRef('');
    setNotes('');
    setSelectedType(DOCUMENT_TYPES[0].id);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', selectedType);
    formData.append('document_number', fileRef);
    formData.append('notes', notes);

    try {
      setError('');
      await api.post('/api/documents', formData);
      resetUploadForm();
      loadDocuments();
    } catch (err) {
      setError(err.message || 'Upload failed.');
    }
  };

  const handleDelete = async (id) => {
    try {
      setError('');
      await api.delete(`/api/documents/${id}`);
      loadDocuments();
    } catch (err) {
      setError(err.message || 'Delete failed.');
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.typeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.reference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || doc.typeId === filterType;
    return matchesSearch && matchesType;
  });

  const getDocMeta = (typeId) => DOCUMENT_TYPES.find((d) => d.id === typeId) || DOCUMENT_TYPES[0];

  const countByType = (typeId) => documents.filter((d) => d.typeId === typeId).length;

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left">
      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-medium border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-error">report_problem</span>
          <span>{error}</span>
        </div>
      )}

      {/* Header Actions Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-3xl font-bold text-on-surface">Document Docket</h2>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">{documents.length} documents on file · {DOCUMENT_TYPES.length} categories</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-primary text-white text-xs font-bold pl-4 pr-5 py-2.5 rounded-xl shadow-lg shadow-primary/10 hover:bg-primary/95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">upload_file</span>
          Upload Document
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <span className="material-symbols-outlined text-on-surface-variant text-sm absolute left-3 top-1/2 -translate-y-1/2">search</span>
            <input
              type="text"
              placeholder="Search by document name, type, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-outline-variant/60 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface placeholder:text-on-surface-variant/60"
            />
          </div>
          <div className="relative min-w-[220px]">
            <span className="material-symbols-outlined text-on-surface-variant text-sm absolute left-3 top-1/2 -translate-y-1/2">filter_list</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-surface border border-outline-variant/60 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface font-medium cursor-pointer appearance-none"
            >
              <option value="All">All Categories ({documents.length})</option>
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name} ({countByType(dt.id)})
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-on-surface-variant text-sm absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-outline-variant/40 pb-4 mb-6">
          <h3 className="font-headline text-2xl font-bold text-on-surface">Filed Documents</h3>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            {filteredDocs.length} result{filteredDocs.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low text-left text-on-surface-variant font-bold uppercase tracking-wider font-label">
                <th className="px-6 py-3">Document</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3">Size</th>
                <th className="px-6 py-3">Uploaded</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-on-surface-variant font-medium">
                    <span className="material-symbols-outlined text-4xl text-outline-variant mb-2 block">folder_off</span>
                    {searchQuery || filterType !== 'All' ? 'No documents match the current filters.' : 'No documents uploaded yet. Click "Upload Document" to get started.'}
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const meta = getDocMeta(doc.typeId);
                  return (
                    <tr key={doc.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${meta.color} flex items-center justify-center shrink-0`}>
                          <span className="material-symbols-outlined text-base">{meta.icon}</span>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm">{doc.fileName}</p>
                          {doc.notes && <p className="text-[10px] text-on-surface-variant mt-0.5 line-clamp-1">{doc.notes}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-on-surface">{doc.typeName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-on-surface-variant">{doc.reference}</span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant font-medium">{doc.size}</td>
                      <td className="px-6 py-4 text-on-surface-variant font-medium">{formatDate(doc.uploadedAt)}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full font-bold text-[9px] uppercase tracking-wider">
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => api.download(`/api/documents/${doc.id}/download`, doc.fileName)}
                            className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                            title="Download"
                          >
                            <span className="material-symbols-outlined text-base">download</span>
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 hover:bg-tertiary-container/30 rounded-lg text-on-surface-variant hover:text-tertiary transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[32px] border border-outline-variant/60 shadow-2xl max-w-lg w-full p-8 space-y-6 relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface">Upload Document</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-1">Select a category and attach the document file.</p>
            </div>

            {/* Document Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Document Category</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface font-medium cursor-pointer"
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>{dt.name}</option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Attach File</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-outline-variant/60 rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/3 transition-colors group"
              >
                <span className="material-symbols-outlined text-3xl text-outline-variant group-hover:text-primary transition-colors">cloud_upload</span>
                <p className="text-xs text-on-surface-variant font-medium mt-2">
                  {fileName ? (
                    <span className="text-on-surface font-bold">{fileName}</span>
                  ) : (
                    'Click to browse or drag & drop your file'
                  )}
                </p>
                <p className="text-[10px] text-on-surface-variant mt-1">PDF, PNG, JPG, DOCX — Max 10 MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.docx,.doc"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    setFileName(file.name);
                  }
                }}
              />
            </div>

            {/* Reference Number */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Reference / ID (Optional)</label>
              <input
                type="text"
                value={fileRef}
                onChange={(e) => setFileRef(e.target.value)}
                placeholder="e.g. INV-2026-00142"
                className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface placeholder:text-on-surface-variant/60"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional details about this document..."
                className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface resize-none placeholder:text-on-surface-variant/60"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={resetUploadForm}
                className="flex-1 border border-outline-variant/60 text-on-surface-variant font-bold py-3 rounded-xl text-xs hover:bg-surface-container cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className={`flex-1 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedFile
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/95'
                    : 'bg-outline-variant/30 text-on-surface-variant cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                Upload & File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
