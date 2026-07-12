import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Vehicles() {
  const { hasRole } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [regions, setRegions] = useState([]);
  const [types, setTypes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filters
  const [filterRegion, setFilterRegion] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');

  // Modal form states
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    vehicle_name: '',
    vehicle_model: '',
    manufacturer: '',
    registration_number: '',
    vehicle_type_id: '',
    region_id: '',
    capacity: '',
    odometer: '',
    acquisition_cost: '',
    status: 'Available',
  });
  
  const [formError, setFormError] = useState('');

  // Load data
  const loadData = async () => {
    try {
      const [vehicleList, regionList, typeList] = await Promise.all([
        api.get('/api/vehicles'),
        api.get('/api/config/regions'),
        api.get('/api/config/vehicle_types'),
      ]);
      setVehicles(vehicleList);
      setRegions(regionList);
      setTypes(typeList);
    } catch (err) {
      console.error('Failed to load vehicle catalog:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      name: '',
      vehicle_name: '',
      vehicle_model: '',
      manufacturer: '',
      registration_number: '',
      vehicle_type_id: types[0]?.id || '',
      region_id: regions[0]?.id || '',
      capacity: '5000',
      odometer: '0',
      acquisition_cost: '45000',
      status: 'Available',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name || '',
      vehicle_name: vehicle.vehicle_name || '',
      vehicle_model: vehicle.vehicle_model || '',
      manufacturer: vehicle.manufacturer || '',
      registration_number: vehicle.registration_number || '',
      vehicle_type_id: vehicle.vehicle_type_id || '',
      region_id: vehicle.region_id || '',
      capacity: vehicle.capacity?.toString() || '0',
      odometer: vehicle.odometer?.toString() || '0',
      acquisition_cost: vehicle.acquisition_cost?.toString() || '0',
      status: vehicle.status || 'Available',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const body = {
      ...formData,
      vehicle_model: formData.vehicle_model || formData.vehicle_name,
      vehicle_name: formData.vehicle_name || formData.vehicle_model,
      vehicle_type_id: formData.vehicle_type_id || null,
      region_id: formData.region_id || null,
      capacity: parseFloat(formData.capacity),
      odometer: parseFloat(formData.odometer),
      acquisition_cost: parseFloat(formData.acquisition_cost),
    };

    try {
      if (editingVehicle) {
        await api.put(`/api/vehicles/${editingVehicle.id}`, body);
      } else {
        await api.post('/api/vehicles', body);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Operation failed. Verify parameters.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Decommission and remove this vehicle from registry permanently?')) return;
    try {
      await api.delete(`/api/vehicles/${id}`);
      loadData();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

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

  // Filter calculations
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicle_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicle_model?.toLowerCase().includes(search.toLowerCase());
      
    const matchesRegion = filterRegion === 'All' || String(v.region_id) === String(filterRegion);
    const matchesStatus = filterStatus === 'All' || v.status === filterStatus;
    const matchesType = filterType === 'All' || String(v.vehicle_type_id) === String(filterType);

    return matchesSearch && matchesRegion && matchesStatus && matchesType;
  });

  const fleetCount = vehicles.length;
  const onTripCount = vehicles.filter(v => v.status === 'On Trip').length;
  const inShopCount = vehicles.filter(v => v.status === 'In Shop').length;

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary-fixed text-primary rounded-xl">
            <span className="material-symbols-outlined">local_shipping</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label">Total Fleet</p>
            <p className="font-headline text-3xl font-bold text-on-surface mt-0.5">{fleetCount}</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl">
            <span className="material-symbols-outlined">bolt</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label">On Trip</p>
            <p className="font-headline text-3xl font-bold text-on-surface mt-0.5">{onTripCount}</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-tertiary-fixed text-tertiary rounded-xl">
            <span className="material-symbols-outlined">build</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label">In Shop</p>
            <p className="font-headline text-3xl font-bold text-on-surface mt-0.5">{inShopCount}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search registry by plate or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface"
            />
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">search</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="pl-4 pr-10 py-2.5 bg-surface border border-outline-variant/60 rounded-xl text-xs font-semibold text-on-surface outline-none cursor-pointer"
            >
              <option value="All">All Over India</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-4 pr-10 py-2.5 bg-surface border border-outline-variant/60 rounded-xl text-xs font-semibold text-on-surface outline-none cursor-pointer"
            >
              <option value="All">All Types</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-4 pr-10 py-2.5 bg-surface border border-outline-variant/60 rounded-xl text-xs font-semibold text-on-surface outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="In Shop">In Shop</option>
              <option value="Retired">Retired</option>
            </select>

            {hasRole(['fleet_manager', 'admin']) && (
              <button
                onClick={handleOpenAdd}
                className="bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer ml-2"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Add Vehicle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Vehicles Table */}
      <div className="bg-surface-container-lowest rounded-[28px] border border-outline-variant/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low text-left">
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Reg Number</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Model / Manufacturer</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Odometer</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Daily Cost</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Active Load</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-on-surface-variant font-medium text-sm">
                    No vehicles found matching the filtered parameters.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  let statusColor = 'bg-surface-container text-on-surface-variant border border-outline-variant/30';
                  if (v.status === 'Available') statusColor = 'bg-green-50 text-green-700 border border-green-150';
                  if (v.status === 'On Trip') statusColor = 'bg-blue-50 text-blue-700 border border-blue-150';
                  if (v.status === 'In Shop') statusColor = 'bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary/10';
                  if (v.status === 'Retired') statusColor = 'bg-red-50 text-red-700 border border-red-150';

                  return (
                    <tr key={v.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-6 py-4.5 font-headline text-lg font-bold text-on-surface">{v.registration_number}</td>
                      <td className="px-6 py-4.5">
                        <p className="text-sm font-semibold text-on-surface">{v.vehicle_name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{v.manufacturer} {v.vehicle_model}</p>
                      </td>
                      <td className="px-6 py-4.5 text-sm font-medium text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline">
                          {v.transit_ops_vehicle_type?.name === 'Van' ? 'airport_shuttle' : 'local_shipping'}
                        </span>
                        <span>{v.transit_ops_vehicle_type?.name || 'Heavy Truck'}</span>
                      </td>
                      <td className="px-6 py-4.5 text-sm font-medium text-on-surface">{(v.odometer || 0).toLocaleString()} km</td>
                      <td className="px-6 py-4.5 text-sm font-semibold text-on-surface">₹{(v.acquisition_cost / 365).toFixed(2)}/day</td>
                      <td className="px-6 py-4.5">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                            <span>{v.capacity?.toLocaleString()} lb</span>
                          </div>
                          <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: '60%' }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right space-x-1 shrink-0">
                        {hasRole(['fleet_manager', 'admin']) && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(v)}
                              className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-high transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="p-1.5 text-on-surface-variant hover:text-tertiary rounded-lg hover:bg-tertiary-container/20 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-left">
            <div className="p-6 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low">
              <h3 className="font-headline text-2xl font-bold text-on-surface">
                {editingVehicle ? 'Edit Vehicle Profile' : 'Onboard New Vehicle'}
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
                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Plate / Registration Number</label>
                  <input
                    type="text"
                    required
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    placeholder="MH-12-AB-7614"
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Internal Reference Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Atlas-01"
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Model Name</label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value, vehicle_name: e.target.value })}
                    placeholder="Prime G2"
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Manufacturer</label>
                  <input
                    type="text"
                    required
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="Atlas Trucks"
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Vehicle Class Type</label>
                  <select
                    value={formData.vehicle_type_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_type_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Assigned Region</label>
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
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Weight Capacity (lb)</label>
                  <input
                    type="number"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                 <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Master Odometer (km)</label>
                  <input
                    type="number"
                    required
                    value={formData.odometer}
                    onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant font-bold">Acquisition Value (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.acquisition_cost}
                    onChange={(e) => setFormData({ ...formData, acquisition_cost: e.target.value })}
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
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
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
                  {editingVehicle ? 'Update Vehicle' : 'Log Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
