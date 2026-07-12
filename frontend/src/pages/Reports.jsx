import { useEffect, useState } from 'react';
import { api } from '../utils/api';

export default function Reports() {
  const [vehicles, setVehicles] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [vehicleList, analyticsData] = await Promise.all([
          api.get('/api/vehicles'),
          api.get('/api/dashboard/analytics'),
        ]);
        setVehicles(vehicleList);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Failed to load strategic reports:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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

  // Filter vehicle listings
  const filteredVehicles = vehicles.filter(v =>
    v.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.vehicle_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left">
      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Fuel Efficiency</span>
            <span className="material-symbols-outlined text-outline text-lg">local_gas_station</span>
          </div>
          <div className="flex items-baseline gap-1 mt-4">
            <p className="font-headline text-3xl font-bold text-on-surface">14.8</p>
            <span className="text-xs text-on-surface-variant font-medium">km/L</span>
          </div>
          <p className="text-[10px] text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full font-bold inline-block mt-2">-2.4% vs target</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Fleet Utilization</span>
            <span className="material-symbols-outlined text-outline text-lg">group_work</span>
          </div>
          <div className="flex items-baseline gap-1 mt-4">
            <p className="font-headline text-3xl font-bold text-on-surface">87.4</p>
            <span className="text-xs text-on-surface-variant font-medium">%</span>
          </div>
          <p className="text-[10px] text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-bold inline-block mt-2">+12% growth</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Operational Cost</span>
            <span className="material-symbols-outlined text-outline text-lg">payments</span>
          </div>
          <div className="flex items-baseline gap-1 mt-4">
            <p className="font-headline text-3xl font-bold text-on-surface">$420.5k</p>
            <span className="text-xs text-on-surface-variant font-medium">USD</span>
          </div>
          <p className="text-[10px] text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-bold inline-block mt-2">+5.1% efficiency</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-primary uppercase tracking-wider font-label">Vehicle ROI</span>
            <span className="material-symbols-outlined text-primary text-lg">show_chart</span>
          </div>
          <div className="flex items-baseline gap-1 mt-4">
            <p className="font-headline text-3xl font-bold text-primary">24.6%</p>
          </div>
          <p className="text-[10px] text-primary bg-primary-fixed px-2 py-0.5 rounded-full font-bold inline-block mt-2">Target Met</p>
        </div>
      </div>

      {/* Analytics Trend & Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend chart mockup */}
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/60 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface">ROI Performance Trend</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Comparative analysis of monthly acquisition recovery.</p>
            </div>
            <div className="flex bg-surface-container rounded-xl p-1 text-[10px] font-bold">
              <button className="px-3 py-1 bg-surface-container-lowest rounded-lg border border-outline-variant/20 shadow-xs cursor-pointer">Line</button>
              <button className="px-3 py-1 text-on-surface-variant cursor-pointer">Area</button>
            </div>
          </div>

          {/* Simple vector representation of a chart to preserve high visual quality */}
          <div className="h-44 bg-surface-container-low rounded-xl border border-outline-variant/40 flex items-end justify-between p-6 relative overflow-hidden">
            <div className="absolute inset-0 flex flex-col justify-between py-6 px-4 pointer-events-none opacity-20">
              <div className="border-t border-outline border-dashed w-full"></div>
              <div className="border-t border-outline border-dashed w-full"></div>
              <div className="border-t border-outline border-dashed w-full"></div>
            </div>

            {/* Sparkline curve */}
            <svg className="absolute inset-0 w-full h-full px-6 py-8" viewBox="0 0 400 100" preserveAspectRatio="none">
              <path d="M 0 80 Q 80 40, 160 50 T 320 20 T 400 35" fill="none" stroke="var(--color-primary)" strokeWidth="3" />
              <path d="M 0 90 Q 80 60, 160 75 T 320 50 T 400 65" fill="none" stroke="var(--color-secondary)" strokeWidth="2" strokeDasharray="4" />
            </svg>

            {/* X-axis labels */}
            <div className="w-full flex justify-between text-[10px] font-bold uppercase tracking-wider text-on-surface-variant relative z-10">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>
        </div>

        {/* Data Exports card */}
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/60 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-headline text-2xl font-bold text-on-surface border-b border-outline-variant/40 pb-4">
              Export Center
            </h3>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
              Compile high-resolution datasets of fleet operations, fuel logs, and driver safety logs for compliance audits or strategic operations reviews.
            </p>

            <div className="space-y-3">
              <button className="w-full bg-surface-container-low border border-outline-variant/60 text-on-surface hover:border-primary hover:text-primary transition-all p-3 rounded-xl flex items-center justify-between text-xs font-bold cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined">csv</span>
                  Export Audit CSV Dataset
                </span>
                <span className="material-symbols-outlined">download</span>
              </button>

              <button className="w-full bg-surface-container-low border border-outline-variant/60 text-on-surface hover:border-primary hover:text-primary transition-all p-3 rounded-xl flex items-center justify-between text-xs font-bold cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined">picture_as_pdf</span>
                  Download Strategy PDF Report
                </span>
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-outline-variant/40 mt-6 flex items-center gap-3">
            <span className="p-2 bg-primary-fixed text-primary rounded-xl">
              <span className="material-symbols-outlined text-lg">event_upcoming</span>
            </span>
            <div className="text-xs">
              <p className="font-bold text-on-surface">Next Audit Scheduled</p>
              <p className="text-on-surface-variant mt-0.5">June 15, 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Vehicle Performance Table */}
      <div className="bg-surface-container-lowest rounded-[28px] border border-outline-variant/60 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low flex-wrap gap-4">
          <div>
            <h4 className="font-headline text-xl font-bold text-on-surface">Per-Vehicle Performance Ledger</h4>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">Granular analytics on operational efficiency and ROI contribution.</p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by vehicle ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface border border-outline-variant/60 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          </div>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low text-left">
                <th className="px-6 py-4 font-bold text-on-surface-variant uppercase tracking-wider font-label">Vehicle Reference</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant uppercase tracking-wider font-label">Fuel Efficiency</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant uppercase tracking-wider font-label">Utilization Rate</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant uppercase tracking-wider font-label">ROI Contribution</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant uppercase tracking-wider font-label">Current Status</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant uppercase tracking-wider font-label text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-on-surface-variant font-medium">
                    No matching vehicle performance records found.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  let statusClass = 'bg-surface-container text-on-surface-variant border border-outline-variant/30';
                  if (v.status === 'Available') statusClass = 'bg-green-50 text-green-700 border border-green-150';
                  if (v.status === 'On Trip') statusClass = 'bg-blue-50 text-blue-700 border border-blue-150';
                  if (v.status === 'In Shop') statusClass = 'bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary/10';

                  // Mocking values for reports demonstration
                  const mockEff = v.transit_ops_vehicle_type?.name === 'Van' ? '16.8 km/L' : '12.2 km/L';
                  const mockUtil = v.status === 'On Trip' ? '92%' : v.status === 'Available' ? '78%' : '0%';
                  const mockRoi = v.status === 'Retired' ? '10.5%' : v.status === 'On Trip' ? '28.4%' : '19.2%';

                  return (
                    <tr key={v.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-on-surface">{v.registration_number}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">{v.vehicle_name}</p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-on-surface">{mockEff}</td>
                      <td className="px-6 py-4 font-semibold text-on-surface">{mockUtil}</td>
                      <td className="px-6 py-4 font-semibold text-on-surface">{mockRoi}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${statusClass}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-colors">
                          <span className="material-symbols-outlined">more_horiz</span>
                        </button>
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
  );
}
