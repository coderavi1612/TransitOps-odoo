import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Trips() {
  const { hasRole } = useAuth();
  
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [regions, setRegions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Trip Configuration Form state
  const [formData, setFormData] = useState({
    name: 'TRP-' + Math.floor(1000 + Math.random() * 9000),
    source: '',
    destination: '',
    cargo_weight: '5000',
    planned_distance: '300',
    vehicle_id: '',
    driver_id: '',
    region_id: '',
    planned_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Complete Trip modal states
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTripForCompletion, setSelectedTripForCompletion] = useState(null);
  const [completionData, setCompletionData] = useState({
    end_odometer: '',
    fuel_consumed: '',
  });

  const loadData = async () => {
    try {
      const [tripList, vehicleList, driverList, regionList] = await Promise.all([
        api.get('/api/trips'),
        api.get('/api/vehicles'),
        api.get('/api/drivers'),
        api.get('/api/config/regions'),
      ]);
      setTrips(tripList);
      setVehicles(vehicleList);
      setDrivers(driverList);
      setRegions(regionList);

      // Set initial select options
      const availableVehicles = vehicleList.filter(v => v.status === 'Available');
      const availableDrivers = driverList.filter(d => d.status === 'Available');
      
      setFormData(prev => ({
        ...prev,
        vehicle_id: availableVehicles[0]?.id || '',
        driver_id: availableDrivers[0]?.id || '',
        region_id: regionList[0]?.id || '',
      }));
    } catch (err) {
      console.error('Failed to load trips data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setError('');

    const body = {
      ...formData,
      vehicle_id: parseInt(formData.vehicle_id),
      driver_id: parseInt(formData.driver_id),
      region_id: parseInt(formData.region_id),
      cargo_weight: parseFloat(formData.cargo_weight),
      planned_distance: parseFloat(formData.planned_distance),
    };

    try {
      await api.post('/api/trips', body);
      // Reset form ID
      setFormData(prev => ({
        ...prev,
        name: 'TRP-' + Math.floor(1000 + Math.random() * 9000),
      }));
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create trip.');
    }
  };

  const handleDispatch = async (id) => {
    setError('');
    try {
      await api.post(`/api/trips/${id}/dispatch`);
      loadData();
    } catch (err) {
      setError(err.message || 'Dispatch checks failed.');
      alert(`Dispatch Error: ${err.message}`);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Abort and cancel this shipment?')) return;
    setError('');
    try {
      await api.post(`/api/trips/${id}/cancel`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to cancel trip.');
    }
  };

  const handleOpenCompleteModal = (trip) => {
    setSelectedTripForCompletion(trip);
    // Suggest end odometer based on planned distance
    const startOdom = trip.start_odometer || 0;
    const plannedDist = trip.planned_distance || 0;
    setCompletionData({
      end_odometer: (startOdom + plannedDist).toString(),
      fuel_consumed: '45',
    });
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.post(`/api/trips/${selectedTripForCompletion.id}/complete`, {
        end_odometer: parseFloat(completionData.end_odometer),
        fuel_consumed: parseFloat(completionData.fuel_consumed),
      });
      setShowCompleteModal(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Completion logging failed.');
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

  // Filter available items for dropdowns
  const availableVehicles = vehicles.filter((v) => v.status === 'Available');
  const availableDrivers = drivers.filter((d) => d.status === 'Available');

  // Selected vehicle details for weight indicator
  const selectedVehicle = vehicles.find(v => v.id === parseInt(formData.vehicle_id));
  const capacityPct = selectedVehicle ? Math.round((parseFloat(formData.cargo_weight) / (selectedVehicle.capacity || 1)) * 100) : 0;

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left">
      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-medium border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-error">report_problem</span>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Create Trip / Draft */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm">
            <div className="flex justify-between items-center border-b border-outline-variant/40 pb-4 mb-6">
              <h3 className="font-headline text-2xl font-bold text-on-surface">New Dispatch</h3>
              <span className="px-2.5 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded-full uppercase tracking-wider">
                {formData.name}
              </span>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-4">
              {/* Route */}
              <div className="space-y-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                <h4 className="font-headline text-md font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary">map</span>
                  Route & Destination
                </h4>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Source Hub</label>
                  <select
                    value={formData.region_id}
                    onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name} Region Hub</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Destination Address</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter delivery address..."
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Est. Distance (mi)</label>
                    <input
                      type="number"
                      required
                      value={formData.planned_distance}
                      onChange={(e) => setFormData({ ...formData, planned_distance: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Planned Date</label>
                    <input
                      type="date"
                      required
                      value={formData.planned_date}
                      onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                </div>
              </div>

              {/* Asset Allocation */}
              <div className="space-y-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                <h4 className="font-headline text-md font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary">local_shipping</span>
                  Asset Allocation
                </h4>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Assigned Vehicle</label>
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    {availableVehicles.length === 0 ? (
                      <option value="">No vehicles available</option>
                    ) : (
                      availableVehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.registration_number} - {v.vehicle_name} ({v.capacity} lb cap)</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Assigned Driver</label>
                  <select
                    value={formData.driver_id}
                    onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    {availableDrivers.length === 0 ? (
                      <option value="">No drivers available</option>
                    ) : (
                      availableDrivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name} (Safety: {d.safety_score})</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Cargo Weight (lb)</label>
                  <input
                    type="number"
                    required
                    value={formData.cargo_weight}
                    onChange={(e) => setFormData({ ...formData, cargo_weight: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                  {selectedVehicle && (
                    <div className="pt-2">
                      <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1">
                        <span>Vehicle Capacity: {selectedVehicle.capacity} lb</span>
                        <span className={capacityPct > 100 ? 'text-error' : 'text-primary'}>{capacityPct}% filled</span>
                      </div>
                      <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${capacityPct > 100 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${Math.min(capacityPct, 100)}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Logistics Dispatch Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Temperature-sensitive freight, high priority shipment..."
                  rows="2"
                  className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                />
              </div>

              {hasRole(['fleet_manager', 'admin']) && (
                <button
                  type="submit"
                  disabled={availableVehicles.length === 0 || availableDrivers.length === 0 || capacityPct > 100}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  Save Trip Draft
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Right Side: Ledger / Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm">
            <h3 className="font-headline text-2xl font-bold text-on-surface border-b border-outline-variant/40 pb-4 mb-6">
              Recent & Active Shipments
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/60 bg-surface-container-low text-left">
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Trip ID</th>
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Route Details</th>
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Vehicle & Driver</th>
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Load Weight</th>
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Status</th>
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {trips.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-on-surface-variant font-medium">
                        No shipment trip records logged in registry.
                      </td>
                    </tr>
                  ) : (
                    trips.map((t) => {
                      let statusClass = 'bg-surface-container text-on-surface-variant border border-outline-variant/30';
                      if (t.state === 'Draft') statusClass = 'bg-secondary-container text-on-secondary-container border border-outline-variant/40';
                      if (t.state === 'Dispatched') statusClass = 'bg-blue-50 text-blue-700 border border-blue-150';
                      if (t.state === 'Completed') statusClass = 'bg-green-50 text-green-700 border border-green-150';
                      if (t.state === 'Cancelled') statusClass = 'bg-red-50 text-red-700 border border-red-150';

                      return (
                        <tr key={t.id} className="hover:bg-surface-container-low transition-all">
                          <td className="px-4 py-3.5 font-bold text-on-surface font-mono">{t.name}</td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-on-surface">{t.transit_ops_region?.name || 'Local'} ➔ {t.destination}</p>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">Est. Distance: {t.planned_distance} mi</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-on-surface">{t.transit_ops_vehicle?.registration_number}</p>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">{t.transit_ops_driver?.name}</p>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-on-surface">{(t.cargo_weight || 0).toLocaleString()} lb</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${statusClass}`}>
                              {t.state}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1 shrink-0">
                            {hasRole(['fleet_manager', 'admin']) && (
                              <>
                                {t.state === 'Draft' && (
                                  <button
                                    onClick={() => handleDispatch(t.id)}
                                    className="px-2.5 py-1 bg-primary text-white font-bold rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <span className="material-symbols-outlined text-xs">rocket_launch</span>
                                    Dispatch
                                  </button>
                                )}

                                {t.state === 'Dispatched' && (
                                  <button
                                    onClick={() => handleOpenCompleteModal(t)}
                                    className="px-2.5 py-1 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <span className="material-symbols-outlined text-xs">check_circle</span>
                                    Complete
                                  </button>
                                )}

                                {(t.state === 'Draft' || t.state === 'Dispatched') && (
                                  <button
                                    onClick={() => handleCancel(t.id)}
                                    className="p-1 text-on-surface-variant hover:text-tertiary hover:bg-tertiary-container/20 rounded-lg transition-colors inline-block"
                                    title="Cancel Trip"
                                  >
                                    <span className="material-symbols-outlined text-sm">block</span>
                                  </button>
                                )}
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
        </div>
      </div>

      {/* Completion Dialog Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden text-left">
            <div className="p-6 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low">
              <h3 className="font-headline text-xl font-bold text-on-surface">
                Complete Shipment: {selectedTripForCompletion?.name}
              </h3>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="p-1 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-full transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1">
                <p className="font-bold text-on-surface-variant">Start Odometer: <span className="text-on-surface">{selectedTripForCompletion?.start_odometer || 0} mi</span></p>
                <p className="font-bold text-on-surface-variant">Planned Route: <span className="text-on-surface">{selectedTripForCompletion?.transit_ops_region?.name} ➔ {selectedTripForCompletion?.destination} ({selectedTripForCompletion?.planned_distance} mi)</span></p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Final Odometer Reading (mi)</label>
                <input
                  type="number"
                  required
                  min={selectedTripForCompletion?.start_odometer || 0}
                  value={completionData.end_odometer}
                  onChange={(e) => setCompletionData({ ...completionData, end_odometer: e.target.value })}
                  className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Fuel Consumed (Liters)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={completionData.fuel_consumed}
                  onChange={(e) => setCompletionData({ ...completionData, fuel_consumed: e.target.value })}
                  className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/40 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-5 py-2 border border-outline text-on-surface-variant font-bold rounded-xl text-xs hover:bg-surface-container transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-green-700/10 hover:bg-green-800 transition-all cursor-pointer"
                >
                  Finalize Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
