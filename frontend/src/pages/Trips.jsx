import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { formatWeight } from '../utils/formatters';
import { regionOptionLabel, regionsByType } from '../utils/regions';
import { useAuth } from '../context/AuthContext';

export default function Trips() {
  const { hasRole } = useAuth();
  const createTripReference = () => 'TRP-' + Math.floor(1000 + Math.random() * 9000);

  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [regions, setRegions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [palletCount, setPalletCount] = useState(11);
  const [unitCount, setUnitCount] = useState(142);
  const [activeTab, setActiveTab] = useState('All');
  
  const [formData, setFormData] = useState(() => ({
    name: createTripReference(),
    source: '',
    destination: '',
    cargo_weight: '5000',
    planned_distance: '300',
    vehicle_id: '',
    driver_id: '',
    region_id: '',
    planned_date: new Date().toISOString().split('T')[0],
    notes: '',
  }));

  const [isDistanceDirty, setIsDistanceDirty] = useState(false);

  // Auto-estimate distance based on source region and destination
  useEffect(() => {
    if (isDistanceDirty) return;

    const selectedRegion = regions.find(r => String(r.id) === String(formData.region_id));
    const regionName = selectedRegion ? selectedRegion.name : '';
    const dest = (formData.destination || '').toLowerCase();
    const src = regionName.toLowerCase();
    
    if (dest.trim().length > 2) {
      let estimated = 300;
      if (src.includes('maharashtra') && dest.includes('pune')) estimated = 150;
      else if (src.includes('karnataka') && dest.includes('chennai')) estimated = 350;
      else if (src.includes('delhi') && dest.includes('jaipur')) estimated = 280;
      else if (src.includes('tamil nadu') && dest.includes('coimbatore')) estimated = 510;
      else if (src.includes('gujarat') && dest.includes('surat')) estimated = 265;
      else if (src.includes('west bengal') && dest.includes('bhubaneswar')) estimated = 440;
      else if (src.includes('maharashtra') && dest.includes('delhi')) estimated = 1400;
      else if (src.includes('maharashtra') && dest.includes('bengaluru')) estimated = 980;
      else {
        // Stable highway distance hashing based on string values
        let hash = 0;
        const str = regionName + formData.destination;
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        estimated = Math.abs(hash % 450) + 120;
      }
      
      setFormData(prev => ({
        ...prev,
        planned_distance: String(estimated)
      }));
    }
  }, [formData.region_id, formData.destination, regions, isDistanceDirty]);

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

  const handleCreateTrip = async (e, dispatch = true) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    if (!formData.vehicle_id || formData.vehicle_id === '') {
      setError('Please select a vehicle. If no vehicles are available, register one first.');
      return;
    }
    if (!formData.driver_id || formData.driver_id === '') {
      setError('Please select an available driver. If no drivers are available, register one first.');
      return;
    }
    if (!formData.destination.trim()) {
      setError('Enter a destination before saving the trip.');
      return;
    }
    if (!(Number(formData.cargo_weight) > 0) || !(Number(formData.planned_distance) > 0)) {
      setError('Cargo weight and planned distance must be greater than zero.');
      return;
    }

    const assignedVehicle = vehicles.find(v => v.id === formData.vehicle_id);
    if (assignedVehicle && Number(formData.cargo_weight) > Number(assignedVehicle.capacity)) {
      setError(`Validation Error: Cargo weight (${formData.cargo_weight} kg) exceeds vehicle capacity (${assignedVehicle.capacity} kg)`);
      return;
    }

    const body = {
      ...formData,
      source: regions.find((region) => String(region.id) === String(formData.region_id))?.name || formData.source || 'Dispatch Hub',
      vehicle_id: formData.vehicle_id,
      driver_id: formData.driver_id,
      region_id: formData.region_id,
      cargo_weight: parseFloat(formData.cargo_weight),
      planned_distance: parseFloat(formData.planned_distance),
    };

    try {
      const createdTrip = await api.post('/api/trips', body);
      const vehicle = vehicles.find(v => v.id === body.vehicle_id);
      const driver = drivers.find(d => d.id === body.driver_id);
      if (dispatch && createdTrip?.id) {
        await api.post(`/api/trips/${createdTrip.id}/dispatch`);
        window.dispatchEvent(new CustomEvent('mock-email', {
          detail: {
            subject: `[SMTP Log] Trip Dispatched: ${createdTrip.name || body.name}`,
            body: `Trip ${createdTrip.name || body.name} has been successfully dispatched to the driver.\nAssigned Driver: ${driver?.name || 'Unknown'}\nAssigned Vehicle: ${vehicle?.registration_number || 'Unknown'} (${vehicle?.vehicle_name || ''})\nRoute: ${body.source} ➔ ${body.destination} (${body.planned_distance} km)\nCargo Weight: ${body.cargo_weight} kg`,
            from: 'dispatcher@transitops.com',
            to: 'all@transitops.com',
            path: '/trips'
          }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('mock-email', {
          detail: {
            subject: `[SMTP Log] Trip Draft Saved: ${createdTrip.name || body.name}`,
            body: `A new draft trip ${createdTrip.name || body.name} has been saved.\nAssigned Driver: ${driver?.name || 'Unknown'}\nAssigned Vehicle: ${vehicle?.registration_number || 'Unknown'} (${vehicle?.vehicle_name || ''})\nRoute: ${body.source} ➔ ${body.destination} (${body.planned_distance} km)`,
            from: 'dispatcher@transitops.com',
            to: 'all@transitops.com',
            path: '/trips'
          }
        }));
      }
      // Reset form ID
      setFormData(prev => ({
        ...prev,
        name: createTripReference(),
        destination: '',
        notes: '',
        planned_distance: '300',
      }));
      setIsDistanceDirty(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create and dispatch trip.');
    }
  };

  const handleDispatch = async (id) => {
    setError('');
    try {
      const trip = trips.find(t => t.id === id);
      await api.post(`/api/trips/${id}/dispatch`);
      window.dispatchEvent(new CustomEvent('mock-email', {
        detail: {
          subject: `[SMTP Log] Trip Dispatched: ${trip?.name || 'Trip'}`,
          body: `Trip ${trip?.name || 'Trip'} has been successfully dispatched to the driver.\nAssigned Driver: ${trip?.drivers?.name || 'Assigned Driver'}\nRoute: ${trip?.source} ➔ ${trip?.destination} (${trip?.planned_distance} km)`,
          from: 'dispatcher@transitops.com',
          to: 'all@transitops.com',
          path: '/trips'
        }
      }));
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
      window.dispatchEvent(new CustomEvent('mock-email', {
        detail: {
          subject: `[SMTP Log] Trip Completed: ${selectedTripForCompletion.name}`,
          body: `Trip ${selectedTripForCompletion.name} has been successfully completed.\nVehicle: ${selectedTripForCompletion.vehicles?.registration_number || 'Vehicle'}\nDriver: ${selectedTripForCompletion.drivers?.name || 'Driver'}\nFinal Odometer: ${completionData.end_odometer} km\nFuel Consumed: ${completionData.fuel_consumed} L`,
          from: 'driver.operator@transitops.com',
          to: 'manager@transitops.com',
          path: '/reports'
        }
      }));
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
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // Filter available items for dropdowns
  const availableVehicles = vehicles.filter((v) => v.status === 'Available');
  const availableDrivers = drivers.filter((d) => d.status === 'Available');

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left">
      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-medium border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-error">report_problem</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-50 text-green-800 text-xs font-medium border border-green-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-green-700">check_circle</span>
          <span>{success}</span>
        </div>
      )}


      {/* Tab Pills filtering recent list */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/40">
        <div className="flex flex-wrap gap-2">
          {['All', 'Draft', 'Dispatched', 'Completed', 'Cancelled'].map((tab) => {
            const isActive = activeTab === tab;
            let badgeColor = 'bg-surface-container text-on-surface-variant';
            if (tab === 'Draft') badgeColor = isActive ? 'bg-primary text-white' : 'hover:bg-primary/10 text-on-surface-variant';
            if (tab === 'Dispatched') badgeColor = isActive ? 'bg-blue-600 text-white' : 'hover:bg-blue-600/10 text-on-surface-variant';
            if (tab === 'Completed') badgeColor = isActive ? 'bg-green-700 text-white' : 'hover:bg-green-700/10 text-on-surface-variant';
            if (tab === 'Cancelled') badgeColor = isActive ? 'bg-red-600 text-white' : 'hover:bg-red-600/10 text-on-surface-variant';
            if (tab === 'All') badgeColor = isActive ? 'bg-on-surface text-surface' : 'hover:bg-surface-container-high';

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${badgeColor}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {tab}
              </button>
            );
          })}
        </div>

        <div className="text-[10px] font-bold text-on-surface-variant font-mono">
          TRIP CONFIGURATION: {formData.name}
        </div>
      </div>

      {/* Recent & Active Trips */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-outline-variant/40 pb-4">
          <h3 className="font-headline text-2xl font-bold text-on-surface">Recent & Active Trips</h3>
          <button onClick={() => setActiveTab('All')} className="text-xs font-bold text-primary hover:underline">View All Trips</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low">
                <th className="px-6 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Trip ID</th>
                <th className="px-6 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Route</th>
                <th className="px-6 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Vehicle / Driver</th>
                <th className="px-6 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Status</th>
                <th className="px-6 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Cargo</th>
                <th className="px-6 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {trips
                .filter(t => activeTab === 'All' || t.state === activeTab)
                .map((t) => {
                  let statusClass = 'bg-surface-container text-on-surface-variant border border-outline-variant/30';
                  if (t.state === 'Draft') statusClass = 'bg-secondary-container text-on-secondary-container border border-outline-variant/40';
                  if (t.state === 'Dispatched') statusClass = 'bg-blue-50 text-blue-700 border border-blue-150';
                  if (t.state === 'Completed') statusClass = 'bg-green-50 text-green-700 border border-green-150';
                  if (t.state === 'Cancelled') statusClass = 'bg-red-50 text-red-700 border border-red-150';

                  return (
                    <tr key={t.id} className="hover:bg-surface-container-low transition-all">
                      <td className="px-6 py-4 font-bold text-on-surface font-mono">{t.name}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-on-surface">{t.transit_ops_region?.name || 'Local'} ➔ {t.destination}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">Est. Distance: {t.planned_distance} km</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-on-surface">{t.transit_ops_vehicle?.registration_number}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">{t.transit_ops_driver?.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${statusClass}`}>
                          {t.state}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-on-surface">{formatWeight(t.cargo_weight)}</td>
                      <td className="px-6 py-4 text-right">
                        {hasRole(['dispatcher', 'admin', 'fleet_manager', 'driver']) && (
                          <div className="relative inline-block group/menu">
                            <button className="p-1 hover:bg-surface-container rounded-lg text-on-surface-variant">
                              <span className="material-symbols-outlined text-base">more_vert</span>
                            </button>
                            
                            {/* Dropdown Menu on hover/click */}
                            <div className="absolute right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-lg z-20 py-1 hidden group-hover/menu:block w-36 text-left">
                              {t.state === 'Draft' && hasRole(['dispatcher', 'admin']) && (
                                <button
                                  onClick={() => handleDispatch(t.id)}
                                  className="w-full px-4 py-2 hover:bg-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-sm text-primary">rocket_launch</span>
                                  Dispatch
                                </button>
                              )}
                              {t.state === 'Dispatched' && hasRole(['dispatcher', 'admin', 'driver']) && (
                                <button
                                  onClick={() => handleOpenCompleteModal(t)}
                                  className="w-full px-4 py-2 hover:bg-surface-container text-xs font-semibold text-green-700 flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-sm text-green-700">check_circle</span>
                                  Complete
                                </button>
                              )}
                              {(t.state === 'Draft' || t.state === 'Dispatched') && hasRole(['dispatcher', 'admin', 'fleet_manager']) && (
                                <button
                                  onClick={() => handleCancel(t.id)}
                                  className="w-full px-4 py-2 hover:bg-surface-container text-xs font-semibold text-error flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-sm text-error">block</span>
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Title Header for Configuration Form */}
      {hasRole(['dispatcher', 'admin']) && (
        <>
          <div className="text-left">
            <h3 className="font-headline text-2xl font-bold text-on-surface">New Trip Configuration</h3>
          </div>

          {/* Main Form Grid Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Route and Asset Allocations */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Card 1: Route & Destination */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-headline text-xl font-bold text-on-surface">Route & Destination</h4>
                <p className="text-xs text-on-surface-variant font-medium mt-1">Define the origin and arrival points for this shipment.</p>
              </div>
              <span className="material-symbols-outlined text-primary text-3xl">map_search</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Source Hub</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary text-lg">location_on</span>
                  <select
                    value={formData.region_id}
                    onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                  >
                    <optgroup label="States">
                      {regionsByType(regions, 'State').map(r => <option key={r.id} value={r.id}>{regionOptionLabel(r)} Hub</option>)}
                    </optgroup>
                    <optgroup label="Union Territories">
                      {regionsByType(regions, 'Union Territory').map(r => <option key={r.id} value={r.id}>{regionOptionLabel(r)} Hub</option>)}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Destination</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">flag</span>
                  <input
                    type="text"
                    required
                    placeholder="Enter delivery address..."
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Planned Distance (km)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">edit_road</span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Distance in km"
                    value={formData.planned_distance}
                    onChange={(e) => {
                      setFormData({ ...formData, planned_distance: e.target.value });
                      setIsDistanceDirty(true);
                    }}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>
              </div>
            </div>

            {/* Route Map Backdrop illustration */}
            <div className="relative rounded-2xl overflow-hidden border border-outline-variant/40 h-44 bg-surface-container-low flex items-center justify-center">
              {/* Minimalist styled grid representing path tracking */}
              <div className="absolute inset-0 bg-cover bg-center scale-105 opacity-55" style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAn5lPTMomJBkI9uPSW-thGTmXuordoMmZ6ZrUrmEy6dZqwLjOXnCQct2EoRDqpZycPmDdh-qkl0e8AspizTwDssBGhTP_UIFkS9I4oN5_fWHKCA90isS616p3ECnWirM3B9cd7czbE8ZCW1FlX0eiYkgwCafM2C8tFybF9HAvKe-sAIagcKhn8b7vEqXQ8JUJTDAPA4Kb43r7N8s_JXrcbLOsFewZLaoxGewYl8INIHXAqEnm3Uu5FXA')` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
              
              {/* Distance Travel Overlays */}
              <div className="relative z-10 flex gap-4 bg-surface-container-lowest/90 backdrop-blur-md p-4 rounded-2xl border border-outline-variant/50 shadow-md">
                <div className="text-center px-4">
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider font-label">Est. Distance</p>
                  <p className="font-headline text-lg font-bold text-primary mt-0.5">{(formData.planned_distance || 300)} km</p>
                </div>
                <div className="w-px bg-outline-variant" />
                <div className="text-center px-4">
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider font-label">Est. Travel Time</p>
                  <p className="font-headline text-lg font-bold text-on-surface mt-0.5">
                    {Math.floor((Number(formData.planned_distance) || 300) / 60)}h {Math.round((Number(formData.planned_distance) || 300) % 60)}m
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Asset & Cargo Allocation */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm space-y-6">
            <h4 className="font-headline text-xl font-bold text-on-surface">Asset & Cargo Allocation</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              
              {/* Inputs List */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Assigned Vehicle</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary">local_shipping</span>
                    <select
                      value={formData.vehicle_id}
                      onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                      className="w-full bg-surface border border-outline-variant/60 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                    >
                      {availableVehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.registration_number} - {v.vehicle_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Assigned Driver</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary">person</span>
                    <select
                      value={formData.driver_id}
                      onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                      className="w-full bg-surface border border-outline-variant/60 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                    >
                      {availableDrivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name} (Safety: {d.safety_score})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Cargo Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={formData.cargo_weight}
                    onChange={(e) => setFormData({ ...formData, cargo_weight: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>
              </div>

              {/* Isometric Truck Render Box with dynamic counts */}
              <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30 flex flex-col items-center justify-center relative overflow-hidden h-60">
                <div className="text-primary text-[80px] leading-none mb-4 animate-pulse">
                  <span className="material-symbols-outlined text-[96px]">local_shipping</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full mt-2">
                  <div className="bg-surface p-3 rounded-xl border border-outline-variant/20 text-center">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider font-label">Pallets</p>
                    <p className="font-headline text-lg font-bold text-on-surface mt-0.5">{palletCount}</p>
                  </div>
                  <div className="bg-surface p-3 rounded-xl border border-outline-variant/20 text-center">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider font-label">Unit Count</p>
                    <p className="font-headline text-lg font-bold text-on-surface mt-0.5">{unitCount}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Additional Items and Logistics Note */}
        <div className="space-y-8 lg:col-span-1">
          
          {/* Card 3: Additional Items */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-headline text-lg font-bold text-on-surface">Additional Items</h4>
              <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">keyboard_arrow_up</span>
            </div>
            
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider font-label">1 Items Currently Added</p>
            
            {/* Pallets Config item */}
            <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-4 flex gap-3 relative">
              <div className="w-16 h-16 bg-surface border border-outline-variant rounded-xl flex items-center justify-center relative shrink-0">
                {/* Pallet Icon */}
                <span className="material-symbols-outlined text-primary text-3xl">inventory_2</span>
                <span className="absolute -top-1.5 -right-1.5 bg-on-surface text-surface text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                  {palletCount}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-bold text-on-surface">Pallets</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5 font-medium">120x100x150 cm</p>
                <p className="text-[10px] text-on-surface-variant font-medium">~ {(palletCount * 90).toLocaleString()} kg</p>
              </div>
              <div className="flex flex-col gap-1 items-center justify-center shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    setPalletCount(prev => prev + 1);
                    setUnitCount(prev => prev + 12);
                  }}
                  className="w-6 h-6 rounded-md bg-surface border border-outline-variant flex items-center justify-center text-xs font-bold hover:bg-surface-container-high transition-colors animate-all"
                >
                  +
                </button>
                <button 
                  type="button"
                  disabled={palletCount <= 1}
                  onClick={() => {
                    setPalletCount(prev => Math.max(1, prev - 1));
                    setUnitCount(prev => Math.max(12, prev - 12));
                  }}
                  className="w-6 h-6 rounded-md bg-surface border border-outline-variant flex items-center justify-center text-xs font-bold hover:bg-surface-container-high transition-colors disabled:opacity-50"
                >
                  -
                </button>
              </div>
            </div>

            {/* Dash Button 1 */}
            <button 
              type="button"
              onClick={() => {
                setPalletCount((count) => count + 1);
                setUnitCount((count) => count + 12);
                setFormData((current) => ({ ...current, notes: `${current.notes}${current.notes ? '\n' : ''}Fragile goods included.` }));
              }}
              className="w-full border-2 border-dashed border-outline-variant/40 hover:border-primary/40 rounded-2xl p-4 flex items-center gap-3 transition-colors text-left cursor-pointer"
            >
              <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-lg">layers</span>
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface">Add Fragile Goods</p>
                <p className="text-[10px] text-on-surface-variant font-medium">Electronics, Glassware</p>
              </div>
            </button>

            {/* Dash Button 2 */}
            <button 
              type="button"
              onClick={() => setFormData((current) => ({ ...current, notes: `${current.notes}${current.notes ? '\n' : ''}Oversized cargo included.` }))}
              className="w-full border-2 border-dashed border-outline-variant/40 hover:border-primary/40 rounded-2xl p-4 flex items-center gap-3 transition-colors text-left cursor-pointer"
            >
              <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-lg">anchor</span>
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface">Add Oversized Cargo</p>
                <p className="text-[10px] text-on-surface-variant font-medium">Machinery, Vehicles</p>
              </div>
            </button>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => {
                  setError('');
                  const weight = palletCount * 90;
                  const palletNote = `${palletCount} Pallets (${unitCount} units) added to cargo.`;
                  setFormData((current) => {
                    const hasNote = current.notes.includes(palletNote);
                    const newNotes = hasNote ? current.notes : `${current.notes}${current.notes ? '\n' : ''}${palletNote}`;
                    return {
                      ...current,
                      cargo_weight: String(weight),
                      notes: newNotes
                    };
                  });
                  setSuccess(`Successfully added ${palletCount} Pallets (${weight.toLocaleString()} kg) to shipment cargo allocation.`);
                  setTimeout(() => setSuccess(''), 5000);
                }}
                className="flex-1 bg-primary text-white text-xs font-bold py-2.5 rounded-xl hover:bg-primary/95 transition-colors cursor-pointer"
              >
                Add Items
              </button>
              <button 
                type="button"
                onClick={() => {
                  const value = window.prompt('Pallet count', String(palletCount));
                  const count = Number.parseInt(value, 10);
                  if (Number.isInteger(count) && count > 0) {
                    setPalletCount(count);
                    setUnitCount(count * 12);
                    setFormData((current) => ({ ...current, cargo_weight: String(count * 90) }));
                  }
                }}
                className="flex-1 border border-outline text-on-surface-variant text-xs font-bold py-2.5 rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Card 4: Internal Logistics Note */}
          <div className="bg-rose-50/50 border border-rose-100 rounded-[32px] p-6 shadow-sm space-y-4">
            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider font-label">Internal Logistics Note</p>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Enter logistics dispatch comments..."
              rows="3"
              className="w-full bg-surface/80 border border-rose-200/60 rounded-2xl p-4 text-xs font-medium italic text-rose-950 focus:ring-1 focus:ring-rose-300 outline-none resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-800 font-label">Priority Status</span>
              <span className="px-3 py-1 bg-rose-200 text-rose-800 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                Urgent
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 p-4 rounded-3xl flex flex-wrap justify-between items-center gap-4 shadow-md">
        <div className="flex items-center gap-6">
          <button 
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, destination: '', notes: '' }))}
            className="text-xs font-bold text-on-surface-variant hover:text-tertiary transition-colors cursor-pointer"
          >
            Discard Draft
          </button>
          <span className="text-[10px] text-on-surface-variant font-mono font-medium">
            Last saved at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="flex gap-3">
          <button 
            type="button"
            onClick={(event) => handleCreateTrip(event, false)}
            className="px-5 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Save as Draft
          </button>
          
          <button 
            type="button"
            onClick={(event) => handleCreateTrip(event, true)}
            className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-primary/10 hover:bg-primary-container hover:text-on-primary-container transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
            DISPATCH TRIP
          </button>
        </div>
      </div>
        </>
      )}



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
                <p className="font-bold text-on-surface-variant">Start Odometer: <span className="text-on-surface">{selectedTripForCompletion?.start_odometer || 0} km</span></p>
                <p className="font-bold text-on-surface-variant">Planned Route: <span className="text-on-surface">{selectedTripForCompletion?.transit_ops_region?.name} ➔ {selectedTripForCompletion?.destination} ({selectedTripForCompletion?.planned_distance} km)</span></p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Final Odometer Reading (km)</label>
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Fuel Consumed (litres)</label>
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
