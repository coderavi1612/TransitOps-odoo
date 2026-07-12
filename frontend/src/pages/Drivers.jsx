import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Drivers() {
  const { hasRole } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // Modal forms
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    license_number: '',
    license_expiry_date: '',
    safety_score: '100',
    status: 'Available',
    region_id: '',
    avatar_url: '',
  });

  const [formError, setFormError] = useState('');
  const [extractingLicense, setExtractingLicense] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataObj = new FormData();
    formDataObj.append('file', file);

    setUploadingPhoto(true);
    setFormError('');
    try {
      const response = await api.post('/api/drivers/upload-avatar', formDataObj);
      setFormData(prev => ({ ...prev, avatar_url: response.url }));
    } catch (err) {
      setFormError(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLicenseUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataObj = new FormData();
    formDataObj.append('file', file);

    setExtractingLicense(true);
    setFormError('');
    try {
      const response = await api.post('/api/drivers/extract-license', formDataObj);
      setFormData(prev => ({
        ...prev,
        license_number: response.license_number,
        license_expiry_date: response.license_expiry_date,
      }));
    } catch (err) {
      setFormError(err.message || 'Failed to extract license details.');
    } finally {
      setExtractingLicense(false);
    }
  };

  const loadData = async () => {
    try {
      const [driverList, regionList] = await Promise.all([
        api.get('/api/drivers'),
        api.get('/api/config/regions'),
      ]);
      setDrivers(driverList);
      setRegions(regionList);
    } catch (err) {
      console.error('Failed to load driver logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      license_number: '',
      license_expiry_date: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
      safety_score: '98',
      status: 'Available',
      region_id: regions[0]?.id || '',
      avatar_url: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (d) => {
    setEditingDriver(d);
    setFormData({
      name: d.name || '',
      phone: d.phone || '',
      email: d.email || '',
      license_number: d.license_number || '',
      license_expiry_date: d.license_expiry_date ? d.license_expiry_date.split('T')[0] : '',
      safety_score: d.safety_score?.toString() || '100',
      status: d.status || 'Available',
      region_id: d.region_id || '',
      avatar_url: d.avatar_url || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const body = {
      ...formData,
      region_id: formData.region_id || null,
      safety_score: parseFloat(formData.safety_score),
    };

    try {
      if (editingDriver) {
        await api.put(`/api/drivers/${editingDriver.id}`, body);
      } else {
        await api.post('/api/drivers', body);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Operation failed. Verify parameters.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this driver profile from system permanently?')) return;
    try {
      await api.delete(`/api/drivers/${id}`);
      loadData();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const categories = ['All Drivers', 'Available', 'On Trip', 'Off Duty', 'Suspended'];

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.license_number?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      filterCategory === 'All Drivers' ||
      filterCategory === 'All' ||
      d.status === filterCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left">
      {/* Top Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Categories select pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  (filterCategory === c || (filterCategory === 'All' && c === 'All Drivers'))
                    ? 'bg-primary border-primary text-white shadow-md shadow-primary/10'
                    : 'bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search driver by name or license..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface"
              />
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">search</span>
            </div>

            {hasRole(['fleet_manager', 'safety_officer', 'admin']) && (
              <button
                onClick={handleOpenAdd}
                className="bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                Add Driver
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center text-xs font-semibold text-on-surface-variant border-t border-outline-variant/30 pt-3">
          <span>Showing {filteredDrivers.length} of {drivers.length} Profiles</span>
        </div>
      </div>

      {/* Driver Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers.map((d) => {
          let statusClass = 'bg-surface-container text-on-surface-variant border border-outline-variant/40';
          if (d.status === 'Available') statusClass = 'bg-green-50 text-green-700 border border-green-150';
          if (d.status === 'On Trip') statusClass = 'bg-blue-50 text-blue-700 border border-blue-150';
          if (d.status === 'Off Duty') statusClass = 'bg-secondary-container text-on-secondary-container border border-outline-variant/40';
          if (d.status === 'Suspended') statusClass = 'bg-red-50 text-red-700 border border-red-150';

          const formattedExpiry = d.license_expiry_date
            ? new Date(d.license_expiry_date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'Pending';

          const isExpired = d.license_expiry_date && new Date(d.license_expiry_date) < new Date();

          return (
            <div key={d.id} className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="space-y-4">
                {/* Top Title Section */}
                <div className="flex justify-between items-start border-b border-outline-variant/40 pb-4">
                  <div className="flex items-center gap-3">
                    {d.avatar_url ? (
                      <img
                        src={d.avatar_url}
                        alt={d.name}
                        className="w-12 h-12 rounded-full object-cover border border-outline-variant/60 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-lg shrink-0">
                        {d.name ? d.name.charAt(0).toUpperCase() : 'D'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-headline text-2xl font-bold text-on-surface group-hover:text-primary transition-colors">{d.name}</h3>
                      <p className="text-xs text-on-surface-variant font-medium mt-0.5">License: {d.license_number}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>
                    {d.status}
                  </span>
                </div>

                {/* Score Dial */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center font-bold text-sm text-primary">
                    {Math.round(d.safety_score || 100)}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label">Safety Rating</p>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">Calculated over past 30 days</p>
                  </div>
                </div>

                {/* Info Fields */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-bold text-on-surface-variant uppercase tracking-wider text-[9px] font-label">License Expiry</p>
                    <p className={`font-semibold mt-1 ${isExpired ? 'text-tertiary' : 'text-on-surface'}`}>{formattedExpiry}</p>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface-variant uppercase tracking-wider text-[9px] font-label">Region</p>
                    <p className="font-semibold text-on-surface mt-1">{d.transit_ops_region?.name || 'Global Operations'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-bold text-on-surface-variant uppercase tracking-wider text-[9px] font-label">Contact</p>
                    <p className="font-semibold text-on-surface mt-1">{d.phone} • {d.email}</p>
                  </div>
                </div>

                {/* License Expiry Alerts */}
                {isExpired && (
                  <div className="p-3 bg-error-container text-on-error-container text-xs rounded-xl flex items-start gap-2 border border-error/15">
                    <span className="material-symbols-outlined text-base text-error shrink-0">warning</span>
                    <p className="font-medium">License is EXPIRED. Driver is blocked from trip assignments.</p>
                  </div>
                )}
                {(() => {
                  const daysToExpiry = d.license_expiry_date
                    ? Math.ceil((new Date(d.license_expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isExpiringSoon = daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 30;
                  return isExpiringSoon ? (
                    <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl flex items-start gap-2 border border-amber-250">
                      <span className="material-symbols-outlined text-base text-amber-700 shrink-0">alarm</span>
                      <p className="font-medium">License expiring in {daysToExpiry} days. Please renew soon.</p>
                    </div>
                  ) : null;
                })()}

                {/* Active Trip Current Status Banner */}
                {d.status === 'On Trip' && d.active_trip && (
                  <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-xl flex items-start gap-2 border border-blue-200">
                    <span className="material-symbols-outlined text-base text-blue-600 shrink-0">navigation</span>
                    <p className="font-medium">En-route: <strong>{d.active_trip.name}</strong> ({d.active_trip.source} → {d.active_trip.destination})</p>
                  </div>
                )}

                {/* Warning Alert if Suspended */}
                {d.status === 'Suspended' && (
                  <div className="p-3 bg-error-container text-on-error-container text-xs rounded-xl flex items-start gap-2 border border-error/15">
                    <span className="material-symbols-outlined text-base text-error shrink-0">report_problem</span>
                    <p className="font-medium">Active suspension: pending driver review and audit.</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 border-t border-outline-variant/40 pt-4">
                {hasRole(['fleet_manager', 'safety_officer', 'admin']) && (
                  <button
                    onClick={() => handleOpenEdit(d)}
                    className="flex-1 border border-outline hover:border-primary text-on-surface-variant hover:text-primary font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Edit Profile
                  </button>
                )}
                {hasRole(['fleet_manager', 'admin']) && (
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="px-3 border border-outline hover:border-tertiary text-on-surface-variant hover:text-tertiary rounded-xl transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Placeholder for Adding New Driver */}
        {hasRole(['fleet_manager', 'safety_officer', 'admin']) && (
          <button
            onClick={handleOpenAdd}
            className="bg-surface-container/20 border-2 border-dashed border-outline-variant hover:border-primary rounded-[32px] p-6 flex flex-col items-center justify-center text-center group transition-all min-h-[300px] cursor-pointer"
          >
            <div className="p-3 rounded-full bg-surface-container group-hover:bg-primary-fixed text-on-surface-variant group-hover:text-primary transition-all mb-4">
              <span className="material-symbols-outlined text-3xl">person_add</span>
            </div>
            <h4 className="font-headline text-xl font-bold text-on-surface">Onboard New Driver</h4>
            <p className="text-xs text-on-surface-variant font-medium mt-1.5 max-w-[200px]">Add a new driver operator to the Sahara Fleet ecosystem.</p>
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-left">
            <div className="p-6 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low">
              <h3 className="font-headline text-2xl font-bold text-on-surface">
                {editingDriver ? 'Edit Driver Profile' : 'Onboard New Driver'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-full transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
              {formError && (
                <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-medium border border-error/20 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-error">report_problem</span>
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5 col-span-2">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Driver Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Marcus Sterling"
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="m.sterling@transitops.in"
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Driver Photo</label>
                  <div className="flex items-center gap-4 bg-surface border border-outline-variant rounded-xl p-3">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-outline-variant" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline">
                        <span className="material-symbols-outlined text-3xl">person</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 text-on-surface-variant hover:text-on-surface text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
                          {uploadingPhoto ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">upload</span>
                              Upload Photo
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingPhoto}
                            onChange={handlePhotoUpload}
                          />
                        </label>
                        {formData.avatar_url && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, avatar_url: '' })}
                            className="text-xs font-bold text-tertiary hover:underline px-2 py-1 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-on-surface-variant font-medium">Supports JPEG, PNG up to 5MB</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">CDL License Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      placeholder="DL-14202600102"
                      className="flex-1 min-w-0 bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                    <label className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-primary/10 hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-1.5 cursor-pointer shrink-0">
                      {extractingLicense ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Extracting...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">document_scanner</span>
                          Scan License
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={extractingLicense}
                        onChange={handleLicenseUpload}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">License Expiration Date</label>
                  <input
                    type="date"
                    required
                    value={formData.license_expiry_date}
                    onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Assigned Hub Region</label>
                  <select
                    value={formData.region_id}
                    onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    <option value="">No Region</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Initial Safety Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.safety_score}
                    onChange={(e) => setFormData({ ...formData, safety_score: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Status Badge</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/40 bg-surface-container-low -mx-8 -mb-8 p-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 border border-outline text-on-surface-variant font-bold rounded-xl text-sm hover:bg-surface-container transition-all cursor-pointer"
                >
                  Discard Draft
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container transition-all cursor-pointer"
                >
                  {editingDriver ? 'Update Profile' : 'Log Onboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
