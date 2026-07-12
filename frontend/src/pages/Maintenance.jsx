import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

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
      vehicle_id: formData.vehicle_id,
      maintenance_type_id: formData.maintenance_type_id || null,
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
      const log = logs.find((item) => item.id === id);
      const vehicle = vehicles.find((item) => item.id === log?.vehicle_id);
      await api.post(`/api/maintenance/${id}/close`, {
        cost: Number(log?.cost || 0),
        odometer: Number(vehicle?.odometer || 0),
      });
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
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // Compute analytics
  const totalCost = logs.reduce((acc, curr) => acc + parseFloat(curr.cost || 0), 0);
  const avgCost = logs.length ? Math.round(totalCost / logs.length) : 0;
  const inShopCount = vehicles.filter(v => v.status === 'In Shop').length;
  const activeFleetCount = vehicles.filter(v => v.status !== 'Retired').length;
  const fleetHealthScore = activeFleetCount
    ? Math.round(((activeFleetCount - inShopCount) / activeFleetCount) * 100)
    : 0;
  const upcomingInspection = logs
    .filter((log) => log.state === 'Scheduled' && log.scheduled_date)
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))[0];

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
        
        {/* Card 1: Fleet Health Score */}
        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Fleet Health Score</span>
            <div className="flex items-baseline gap-2">
              <p className="font-headline text-4xl font-extrabold text-on-surface">{fleetHealthScore}%</p>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-800 text-[10px] font-bold rounded-full border border-rose-100">{inShopCount} in shop</span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed max-w-xs">
              Your enterprise fleet is performing above industry benchmarks. {inShopCount} vehicles are currently in shop for scheduled tune-ups.
            </p>
          </div>
          
          {/* Circular gauge with heart */}
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="32" className="stroke-outline-variant/30 fill-none" strokeWidth="6" />
              <circle 
                cx="40" 
                cy="40" 
                r="32" 
                className="stroke-primary fill-none" 
                strokeWidth="6" 
                strokeDasharray={`${2 * Math.PI * 32}`} 
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - fleetHealthScore / 100)}`} 
              />
            </svg>
            <span className="material-symbols-outlined text-primary text-xl absolute">favorite</span>
          </div>
        </div>

        {/* Card 2: Upcoming Inspection */}
        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label">Upcoming Inspection</span>
            <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 flex items-center gap-3 mt-3">
              <span className="material-symbols-outlined text-primary p-2 bg-surface rounded-lg">calendar_today</span>
              <div className="text-xs">
                <p className="font-bold text-on-surface">
                  {upcomingInspection?.transit_ops_vehicle?.vehicle_name || upcomingInspection?.transit_ops_vehicle?.registration_number || 'No inspection scheduled'}
                </p>
                <p className="text-[10px] text-on-surface-variant mt-0.5 font-medium">
                  {upcomingInspection ? new Date(upcomingInspection.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Create a maintenance record'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full" style={{ width: '75%' }}></div>
            </div>
            <p className="text-[10px] text-on-surface-variant font-medium">
              {upcomingInspection?.transit_ops_maintenance_type?.name || 'Scheduled items will appear here.'}
            </p>
          </div>
        </div>

        {/* Card 3: Avg Service Cost */}
        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label">Avg. Service Cost</span>
            <p className="font-headline text-3xl font-extrabold text-on-surface mt-2">{formatCurrency(avgCost, { maximumFractionDigits: 0 })}</p>
            <p className="text-[10px] text-on-surface-variant mt-1.5 font-medium">Estimated monthly average per unit</p>
          </div>
          
          {/* Sparkline column graph */}
          <div className="flex items-end gap-1 h-12 shrink-0">
            {[30, 45, 35, 60, 40].map((h, i) => (
              <div key={i} className={`w-2.5 rounded-t-xs ${i === 3 ? 'bg-primary' : 'bg-primary-container/60'}`} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Schedule Form (spans 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm relative">
            <div className="flex justify-between items-center border-b border-outline-variant/40 pb-4 mb-6">
              <h3 className="font-headline text-2xl font-bold text-on-surface">Schedule Maintenance</h3>
              <span className="px-3 py-1 bg-rose-50 text-rose-800 text-[10px] font-bold rounded-full border border-rose-100 uppercase tracking-wider">
                New Log Entry
              </span>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-label">Select Vehicle</label>
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} - {v.vehicle_name} ({v.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-label">Service Type</label>
                  <select
                    value={formData.maintenance_type_id}
                    onChange={(e) => setFormData({ ...formData, maintenance_type_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                  >
                    {mTypes.map(mt => (
                      <option key={mt.id} value={mt.id}>{mt.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-label">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-label">Estimated Cost (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">₹</span>
                    <input
                      type="number"
                      required
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full bg-surface border border-outline-variant/60 rounded-xl pl-8 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-label">Maintenance Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Describe symptoms or specific components to check..."
                  rows="3"
                  className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-outline-variant/40">
                <p className="text-[10px] text-on-surface-variant leading-relaxed max-w-sm">
                  * Saving this entry will automatically update vehicle status to <span className="font-bold text-primary">'In Shop'</span>, removing it from active dispatcher pools.
                </p>

                {hasRole(['fleet_manager', 'admin']) && (
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/10 hover:bg-primary/95 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    Finalize Log Entry
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Recent Records List (spans 1 column) */}
        <div className="lg:col-span-1 space-y-6 text-xs">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant/40 pb-4">
              <h3 className="font-headline text-lg font-bold text-on-surface">Recent Records</h3>
              <button onClick={() => api.download('/api/dashboard/reports/maintenance/export', 'transitops-maintenance.csv').catch((err) => setError(err.message))} className="text-xs font-bold text-primary hover:underline">Export CSV</button>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
              {logs.length === 0 ? (
                <p className="text-center py-8 text-on-surface-variant font-medium">
                  No maintenance records logged in fleet history.
                </p>
              ) : (
                logs.map((log) => {
                  let badgeColor = 'bg-surface-container text-on-surface-variant border border-outline-variant/30';
                  let logStateLabel = log.state;
                  if (log.state === 'Scheduled') {
                    badgeColor = 'bg-blue-50 text-blue-800 border border-blue-100';
                    logStateLabel = 'SCHEDULED';
                  }
                  if (log.state === 'Open') {
                    badgeColor = 'bg-orange-50 text-orange-800 border border-orange-100';
                    logStateLabel = 'IN SHOP / IN PROGRESS';
                  }
                  if (log.state === 'Closed') {
                    badgeColor = 'bg-rose-50 text-rose-800 border border-rose-100';
                    logStateLabel = 'COMPLETED';
                  }

                  return (
                    <div key={log.id} className="bg-surface-container-low/70 hover:bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 space-y-3 transition-colors relative group">
                      
                      {/* Top Row: State and Date */}
                      <div className="flex justify-between items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full font-extrabold text-[8px] tracking-wider ${badgeColor}`}>
                          {logStateLabel}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-medium">
                          {new Date(log.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Info details */}
                      <div>
                        <h4 className="font-bold text-on-surface text-sm">
                          {log.transit_ops_vehicle?.vehicle_name || 'Vehicle'} #{log.transit_ops_vehicle?.registration_number}
                        </h4>
                        {log.notes && <p className="text-on-surface-variant mt-1 text-[11px] leading-relaxed">"{log.notes}"</p>}
                      </div>

                      {/* Cost and Actions */}
                      <div className="flex justify-between items-end pt-2 border-t border-outline-variant/20">
                        <p className="font-bold text-on-surface text-xs">{formatCurrency(log.cost, { maximumFractionDigits: 0 })}</p>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasRole(['fleet_manager', 'admin']) && (
                            <>
                              {log.state === 'Scheduled' && (
                                <button
                                  onClick={() => handleOpenLog(log.id)}
                                  className="p-1 hover:bg-primary/10 text-primary rounded transition-colors"
                                  title="Start Service"
                                >
                                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                                </button>
                              )}
                              {log.state === 'Open' && (
                                <button
                                  onClick={() => handleCloseLog(log.id)}
                                  className="p-1 hover:bg-green-700/10 text-green-700 rounded transition-colors"
                                  title="Complete Service"
                                >
                                  <span className="material-symbols-outlined text-sm">check</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-1 hover:bg-tertiary-container/30 text-on-surface-variant hover:text-tertiary rounded transition-colors"
                                title="Delete Record"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </>
                          )}
                          <span className="material-symbols-outlined text-outline text-lg">article</span>
                        </div>
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
