import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { formatCurrency, formatWeight } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { alerts } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [vTypes, setVTypes] = useState([]);
  const [regions, setRegions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Fetch initial configuration on load
  useEffect(() => {
    async function loadInitial() {
      try {
        const [kpiData, typeData, regionData, vehicleData] = await Promise.all([
          api.get('/api/dashboard/kpis'),
          api.get('/api/config/vehicle_types'),
          api.get('/api/config/regions'),
          api.get('/api/vehicles'),
        ]);
        setKpis(kpiData);
        setVTypes(typeData);
        setRegions(regionData);
        setVehicles(vehicleData);
      } catch (err) {
        console.error('Failed to load initial dashboard data:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Re-fetch filtered KPIs on state changes
  useEffect(() => {
    async function reloadKpis() {
      try {
        const query = `?region=${selectedRegion}&status=${selectedStatus}&type=${selectedType}`;
        const kpiData = await api.get(`/api/dashboard/kpis${query}`);
        setKpis(kpiData);
      } catch (err) {
        console.warn('Failed to reload filtered KPIs:', err.message);
      }
    }
    if (!loading) {
      reloadKpis();
    }
  }, [loading, selectedRegion, selectedStatus, selectedType]);

  const statuses = ['Available', 'On Trip', 'In Shop', 'Retired'];

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

  const activeVehicles = kpis?.active_vehicles ?? 0;
  const availableVehicles = kpis?.available_vehicles ?? 0;
  const vehiclesMaintenance = kpis?.vehicles_in_maintenance ?? 0;
  const activeTrips = kpis?.active_trips ?? 0;
  const pendingTrips = kpis?.pending_trips ?? 0;
  const driversOnDuty = kpis?.drivers_on_duty ?? 0;
  const utilization = Math.round(kpis?.fleet_utilization ?? 0);
  const featuredVehicle = vehicles.find((vehicle) => vehicle.status === 'Available') || vehicles[0];
  const dailyCost = featuredVehicle?.acquisition_cost ? Number(featuredVehicle.acquisition_cost) / 365 : 0;
  const capacity = Number(featuredVehicle?.capacity || 0);

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left">
      {/* Top Filter & Actions Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40">
        <div className="flex flex-wrap gap-3">
          {/* Region Filter */}
          <div className="relative">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="pl-4 pr-10 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-semibold text-on-surface outline-none appearance-none cursor-pointer"
            >
              <option value="All">All Over India</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-base">expand_more</span>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="pl-4 pr-10 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-semibold text-on-surface outline-none appearance-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-base">expand_more</span>
          </div>

          {/* Vehicle Type Filter */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="pl-4 pr-10 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-semibold text-on-surface outline-none appearance-none cursor-pointer"
            >
              <option value="All">All Vehicle Types</option>
              {vTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-base">expand_more</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/trips')}
          className="bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          Add New Shipment
        </button>
      </div>

      {/* KPI Counters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* KPI 1: Active Vehicles */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label leading-tight">Active Vehicles</span>
            <span className="material-symbols-outlined text-outline text-md shrink-0">local_shipping</span>
          </div>
          <div className="mt-3">
            <p className="font-headline text-2xl md:text-3xl font-bold text-on-surface leading-none">{activeVehicles}</p>
            <p className="text-[9px] text-on-surface-variant mt-1.5 font-medium">In circulation</p>
          </div>
        </div>

        {/* KPI 2: Available Vehicles */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label leading-tight">Available Vehicles</span>
            <span className="material-symbols-outlined text-green-700 text-md shrink-0">check_circle</span>
          </div>
          <div className="mt-3">
            <p className="font-headline text-2xl md:text-3xl font-bold text-on-surface leading-none">{availableVehicles}</p>
            <p className="text-[9px] text-on-surface-variant mt-1.5 font-medium">Ready for dispatch</p>
          </div>
        </div>

        {/* KPI 3: Vehicles in Maintenance */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label leading-tight">In Maintenance</span>
            <span className="material-symbols-outlined text-tertiary text-md shrink-0">build</span>
          </div>
          <div className="mt-3">
            <p className="font-headline text-2xl md:text-3xl font-bold text-on-surface leading-none">{vehiclesMaintenance}</p>
            <p className="text-[9px] text-on-surface-variant mt-1.5 font-medium">In-shop tune-ups</p>
          </div>
        </div>

        {/* KPI 4: Active Trips */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label leading-tight">Active Trips</span>
            <span className="material-symbols-outlined text-outline text-md shrink-0">route</span>
          </div>
          <div className="mt-3">
            <p className="font-headline text-2xl md:text-3xl font-bold text-on-surface leading-none">{activeTrips}</p>
            <p className="text-[9px] text-on-surface-variant mt-1.5 font-medium">Currently en-route</p>
          </div>
        </div>

        {/* KPI 5: Pending Trips */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label leading-tight">Pending Trips</span>
            <span className="material-symbols-outlined text-outline text-md shrink-0">schedule</span>
          </div>
          <div className="mt-3">
            <p className="font-headline text-2xl md:text-3xl font-bold text-on-surface leading-none">{pendingTrips}</p>
            <p className="text-[9px] text-on-surface-variant mt-1.5 font-medium">Awaiting loading</p>
          </div>
        </div>

        {/* KPI 6: Drivers On Duty */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label leading-tight">Drivers On Duty</span>
            <span className="material-symbols-outlined text-outline text-md shrink-0">person_pin</span>
          </div>
          <div className="mt-3">
            <p className="font-headline text-2xl md:text-3xl font-bold text-on-surface leading-none">{driversOnDuty}</p>
            <p className="text-[9px] text-on-surface-variant mt-1.5 font-medium">Assigned operators</p>
          </div>
        </div>

        {/* KPI 7: Fleet Utilization */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 shadow-sm bg-gradient-to-br from-primary/5 to-transparent flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-label leading-tight">Utilization</span>
            <span className="material-symbols-outlined text-primary text-md shrink-0">trending_up</span>
          </div>
          <div className="mt-3">
            <p className="font-headline text-2xl md:text-3xl font-bold text-primary leading-none">{utilization}%</p>
            <p className="text-[9px] text-on-surface-variant mt-1.5 font-medium">Active fleet usage</p>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Focus Panel: Selected Vehicle */}
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/60 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">local_shipping</span>
              <div>
                <h3 className="font-headline text-2xl font-bold text-on-surface">
                  {featuredVehicle?.registration_number || 'No vehicle selected'}
                </h3>
                <p className="text-xs text-on-surface-variant font-medium">
                  {[featuredVehicle?.vehicle_name || featuredVehicle?.name, featuredVehicle?.transit_ops_vehicle_type?.name]
                    .filter(Boolean)
                    .join(' • ') || 'Fleet record will appear here'}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-150 rounded-full text-xs font-semibold">
              {featuredVehicle?.status || 'No data'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Odometer Value</p>
              <p className="font-headline text-2xl font-bold text-on-surface mt-1">
                {Number(featuredVehicle?.odometer || 0).toLocaleString()} km
              </p>
              <p className="text-xs text-on-surface-variant mt-1 font-medium">Current master reading</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Daily Cost Estimate</p>
              <p className="font-headline text-2xl font-bold text-on-surface mt-1">{formatCurrency(dailyCost)}</p>
              <p className="text-xs text-on-surface-variant mt-1 font-medium">Based on fuel & servicing</p>
            </div>
          </div>

          {/* Odometer Capacity bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-on-surface-variant">Active Load Capacity</span>
              <span className="text-on-surface">{formatWeight(capacity)} capacity</span>
            </div>
            <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: featuredVehicle ? '100%' : '0%' }}></div>
            </div>
          </div>

          {/* Live Speed Tracking sparkline/design */}
          <div className="pt-4 space-y-3">
            <h4 className="font-headline text-lg font-bold text-on-surface">Operational Speed Analysis</h4>
            <div className="h-28 bg-surface-container-low rounded-xl border border-outline-variant/40 flex items-end justify-between px-6 py-4 relative">
              <div className="absolute top-3 left-4 flex gap-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <span>Avg: 54 km/h</span>
                <span className="text-primary">Peak: 72 km/h</span>
              </div>
              {/* Minimal bar graphs to represent speed sparkline */}
              {[40, 55, 60, 45, 30, 50, 68, 72, 60, 55, 50, 45, 65, 55, 48].map((h, i) => (
                <div key={i} className="w-3 bg-primary-container rounded-t-sm transition-all hover:bg-primary" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Alerts & Notifications */}
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/60 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
              <h4 className="font-headline text-2xl font-bold text-on-surface">Recent Alerts</h4>
              <span className="px-2.5 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold rounded-full uppercase tracking-wider">{alerts.length} New</span>
            </div>

            {/* Alert List */}
            <div className="space-y-5">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex gap-4 items-start p-4 rounded-xl hover:bg-surface-container-low transition-all border border-transparent hover:border-outline-variant/35 group">
                  <div className={`p-2.5 rounded-xl ${alert.color} shrink-0`}>
                    <span className="material-symbols-outlined text-xl">{alert.icon}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{alert.type}</span>
                      <span className="text-[10px] text-on-surface-variant font-semibold">{alert.time}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant font-medium leading-relaxed">{alert.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => navigate('/maintenance')} className="w-full border border-outline hover:border-primary text-on-surface-variant hover:text-primary font-bold py-3.5 rounded-xl text-xs mt-6 transition-all cursor-pointer flex items-center justify-center gap-2">
            View All Critical Alerts
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
