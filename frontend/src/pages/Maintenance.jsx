import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Maintenance() {
  const { hasRole } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [mTypes, setMTypes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Scheduling Form state
  const [formData, setFormData] = useState({
    vehicle_id: '',
    maintenance_type_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    cost: '150',
    notes: '',
    state: 'Scheduled',
  });

  const loadData = async () => {
    try {
      const [logList, vehicleList, typeList] = await Promise.all([
        api.get('/api/maintenance'),
        api.get('/api/vehicles'),
        api.get('/api/config/maintenance_types'),
      ]);
      setLogs(logList);
      setVehicles(vehicleList);
      setMTypes(typeList);

      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicleList[0]?.id || '',
        maintenance_type_id: typeList[0]?.id || '',
      }));
    } catch (err) {
      console.error('Failed to load maintenance logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const body = {
      ...formData,
      vehicle_id: parseInt(formData.vehicle_id),
      maintenance_type_id: parseInt(formData.maintenance_type_id),
      cost: parseFloat(formData.cost),
    };

    try {
      await api.post('/api/maintenance', body);
      // Reset notes/cost
      setFormData(prev => ({
        ...prev,
        notes: '',
        cost: '150',
      }));
      loadData();
    } catch (err) {
      setError(err.message || 'Scheduling failed.');
    }
  };

  const handleOpenLog = async (id) => {
    setError('');
    try {
      await api.post(`/api/maintenance/${id}/open`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to open log.');
    }
  };

  const handleCloseLog = async (id) => {
    setError('');
    try {
      await api.post(`/api/maintenance/${id}/close`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to close log.');
    }
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm('Delete this maintenance record from audit logs?')) return;
    setError('');
    try {
      await api.delete(`/api/maintenance/${id}`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete record.');
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

  // Selected vehicle for details block
  const selectedVehicle = vehicles.find(v => v.id === parseInt(formData.vehicle_id));

  // Compute analytics
  const totalCost = logs.reduce((acc, curr) => acc + parseFloat(curr.cost || 0), 0);
  const avgCost = logs.length ? Math.round(totalCost / logs.length) : 0;
  const inShopCount = vehicles.filter(v => v.status === 'In Shop').length;

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left">
      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-medium border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-error">report_problem</span>
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Fleet Health Score</span>
            <p className="font-headline text-3xl font-bold text-on-surface mt-2">94%</p>
            <p className="text-xs text-on-surface-variant mt-1.5 font-medium">+2.4% vs industry benchmarks</p>
          </div>
          <span className="material-symbols-outlined text-green-700 text-3xl p-3 bg-green-50 rounded-full border border-green-100">favorite</span>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Avg Service Cost</span>
            <p className="font-headline text-3xl font-bold text-on-surface mt-2">${avgCost.toLocaleString()}</p>
            <p className="text-xs text-on-surface-variant mt-1.5 font-medium">Estimated average per maintenance log</p>
          </div>
          <span className="material-symbols-outlined text-primary text-3xl p-3 bg-primary-fixed rounded-full">payments</span>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Vehicles in Shop</span>
            <p className="font-headline text-3xl font-bold text-on-surface mt-2">{inShopCount} Active</p>
            <p className="text-xs text-on-surface-variant mt-1.5 font-medium">Currently undergoing tune-ups</p>
          </div>
          <span className="material-symbols-outlined text-tertiary text-3xl p-3 bg-tertiary-fixed rounded-full">build</span>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Schedule Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm">
            <h3 className="font-headline text-2xl font-bold text-on-surface border-b border-outline-variant/40 pb-4 mb-6">
              Schedule Maintenance
            </h3>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Select Vehicle</label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.vehicle_name} ({v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Service Type</label>
                <select
                  value={formData.maintenance_type_id}
                  onChange={(e) => setFormData({ ...formData, maintenance_type_id: e.target.value })}
                  className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                >
                  {mTypes.map(mt => (
                    <option key={mt.id} value={mt.id}>{mt.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Estimated Cost ($)</label>
                  <input
                    type="number"
                    required
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Maintenance Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Describe symptoms or components to inspect..."
                  rows="3"
                  className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                />
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl text-[10px] text-on-surface-variant leading-relaxed">
                <span>* Opening a Scheduled entry will automatically shift vehicle status to </span>
                <span className="font-bold text-primary">'In Shop'</span>
                <span>, removing it from active dispatcher pools.</span>
              </div>

              {hasRole(['fleet_manager', 'safety_officer', 'admin']) && (
                <button
                  type="submit"
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                >
                  <span className="material-symbols-outlined text-base">calendar_today</span>
                  Log Scheduled Service
                </button>
              )}
            </form>
          </div>

          {/* Vehicle Reference details card */}
          {selectedVehicle && (
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-surface-container text-on-surface-variant rounded-full">
                <span className="material-symbols-outlined text-2xl">local_shipping</span>
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-on-surface">Vehicle Ref: {selectedVehicle.registration_number}</h4>
                <p className="text-on-surface-variant mt-0.5">Odometer: {selectedVehicle.odometer?.toLocaleString()} mi</p>
                <p className="text-on-surface-variant">Type: {selectedVehicle.transit_ops_vehicle_type?.name || 'Heavy Semi'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Maintenance Logs Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm">
            <h3 className="font-headline text-2xl font-bold text-on-surface border-b border-outline-variant/40 pb-4 mb-6">
              Maintenance Audit Trail
            </h3>

            <div className="space-y-4">
              {logs.length === 0 ? (
                <p className="text-center py-8 text-xs text-on-surface-variant font-medium">
                  No maintenance records logged in fleet history.
                </p>
              ) : (
                logs.map((log) => {
                  let badgeColor = 'bg-surface-container text-on-surface-variant border border-outline-variant/30';
                  if (log.state === 'Scheduled') badgeColor = 'bg-secondary-container text-on-secondary-container border border-outline-variant/40';
                  if (log.state === 'Open') badgeColor = 'bg-blue-50 text-blue-700 border border-blue-150';
                  if (log.state === 'Closed') badgeColor = 'bg-green-50 text-green-700 border border-green-150';

                  return (
                    <div key={log.id} className="p-4 rounded-2xl border border-outline-variant/40 hover:bg-surface-container-low transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-surface-container text-on-surface-variant rounded-xl shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-lg">build</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-on-surface">{log.transit_ops_vehicle?.registration_number}</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${badgeColor}`}>{log.state}</span>
                          </div>
                          <p className="font-semibold text-on-surface-variant">Service: {log.transit_ops_maintenance_type?.name}</p>
                          {log.notes && <p className="text-on-surface-variant italic">"{log.notes}"</p>}
                          <p className="text-[10px] text-on-surface-variant font-medium">Logged Date: {new Date(log.scheduled_date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-outline-variant/30 pt-3 md:pt-0">
                        <div className="text-right text-xs">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label">Service Cost</p>
                          <p className="font-headline text-lg font-bold text-on-surface">${parseFloat(log.cost || 0).toLocaleString()}</p>
                        </div>

                        {hasRole(['fleet_manager', 'safety_officer', 'admin']) && (
                          <div className="flex items-center gap-2 shrink-0">
                            {log.state === 'Scheduled' && (
                              <button
                                onClick={() => handleOpenLog(log.id)}
                                className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-xs">play_arrow</span>
                                Start Service
                              </button>
                            )}

                            {log.state === 'Open' && (
                              <button
                                onClick={() => handleCloseLog(log.id)}
                                className="px-3 py-1 bg-green-700 text-white text-[10px] font-bold rounded-lg hover:bg-green-800 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-xs">check</span>
                                Close Log
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1 hover:bg-tertiary-container/30 text-on-surface-variant hover:text-tertiary rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
