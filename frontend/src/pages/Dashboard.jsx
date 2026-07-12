import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Fetch KPIs on load
  useEffect(() => {
    async function loadKpis() {
      try {
        const data = await api.get('/api/dashboard/kpis');
        setKpis(data);
      } catch (err) {
        console.error('Failed to load dashboard KPIs:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadKpis();
  }, []);

  const regions = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat', 'Uttar Pradesh'];
  const statuses = ['Available', 'On Route', 'In Transit', 'Loading', 'Maintenance', 'Offline'];

  // Static alerts mock-up matching mockup design
  const alerts = [
    {
      id: 1,
      type: 'Route Deviation',
      time: '2m ago',
      desc: 'LOG7614390 has exited the planned delivery corridor in Sector 7G.',
      icon: 'warning',
      color: 'text-tertiary bg-tertiary-fixed',
    },
    {
      id: 2,
      type: 'Service Required',
      time: '15m ago',
      desc: 'Brake sensor warning reported on Vehicle ID #042 during morning inspection.',
      icon: 'build',
      color: 'text-primary bg-primary-fixed',
    },
    {
      id: 3,
      type: 'Delayed Delivery',
      time: '1h ago',
      desc: 'Traffic congestion on Highway 405 affecting Emily Carter\'s schedule.',
      icon: 'timer',
      color: 'text-secondary bg-secondary-fixed',
    },
  ];

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

  // Fallbacks for KPIs
  const activeVehicles = kpis?.active_vehicles ?? 120;
  const availableVehicles = kpis?.available_vehicles ?? 86;
  const vehiclesMaintenance = kpis?.vehicles_in_maintenance ?? 12;
  const activeTrips = kpis?.active_trips ?? 22;
  const pendingTrips = kpis?.pending_trips ?? 5;
  const driversOnDuty = kpis?.drivers_on_duty ?? 34;
  const utilization = Math.round((activeTrips / (activeVehicles || 1)) * 100) || 88;

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
              <option value="All">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Active Vehicles</span>
            <span className="text-[10px] text-green-700 bg-green-50 border border-green-150 px-2 py-0.5 rounded-full font-bold">+4%</span>
          </div>
          <p className="font-headline text-4xl font-bold text-on-surface mt-4">{activeVehicles}</p>
          <p className="text-xs text-on-surface-variant mt-1.5 font-medium">In circulation</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Available Units</span>
            <span className="text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full font-bold">Steady</span>
          </div>
          <p className="font-headline text-4xl font-bold text-on-surface mt-4">{availableVehicles}</p>
          <p className="text-xs text-on-surface-variant mt-1.5 font-medium">Ready for dispatch</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">In Maintenance</span>
            <span className="material-symbols-outlined text-outline text-lg">build</span>
          </div>
          <p className="font-headline text-4xl font-bold text-on-surface mt-4">{vehiclesMaintenance}</p>
          <p className="text-xs text-on-surface-variant mt-1.5 font-medium">Undergoing tune-ups</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-primary uppercase tracking-wider font-label">Utilization</span>
            <span className="material-symbols-outlined text-primary text-lg">trending_up</span>
          </div>
          <p className="font-headline text-4xl font-bold text-primary mt-4">{utilization}%</p>
          <p className="text-xs text-on-surface-variant mt-1.5 font-medium">Avg capacity usage</p>
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
                <h3 className="font-headline text-2xl font-bold text-on-surface">SAH-TR-761</h3>
                <p className="text-xs text-on-surface-variant font-medium">Sahara Hauler Pro-X • Heavy Truck</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-150 rounded-full text-xs font-semibold">Available</span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Odometer Value</p>
              <p className="font-headline text-2xl font-bold text-on-surface mt-1">12,450 mi</p>
              <p className="text-xs text-on-surface-variant mt-1 font-medium">Last logged 1,185 mi ago</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Daily Cost Estimate</p>
              <p className="font-headline text-2xl font-bold text-on-surface mt-1">$142.50</p>
              <p className="text-xs text-on-surface-variant mt-1 font-medium">Based on fuel & servicing</p>
            </div>
          </div>

          {/* Odometer Capacity bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-on-surface-variant">Active Load Capacity</span>
              <span className="text-on-surface">8,500 / 15,000 lb (56%)</span>
            </div>
            <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: '56.6%' }}></div>
            </div>
          </div>

          {/* Live Speed Tracking sparkline/design */}
          <div className="pt-4 space-y-3">
            <h4 className="font-headline text-lg font-bold text-on-surface">Operational Speed Analysis</h4>
            <div className="h-28 bg-surface-container-low rounded-xl border border-outline-variant/40 flex items-end justify-between px-6 py-4 relative">
              <div className="absolute top-3 left-4 flex gap-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <span>Avg: 54 mph</span>
                <span className="text-primary">Peak: 72 mph</span>
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
              <span className="px-2.5 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold rounded-full uppercase tracking-wider">3 New</span>
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

          <button className="w-full border border-outline hover:border-primary text-on-surface-variant hover:text-primary font-bold py-3.5 rounded-xl text-xs mt-6 transition-all cursor-pointer flex items-center justify-center gap-2">
            View All Critical Alerts
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
