import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [performanceRows, setPerformanceRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [exportError, setExportError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartMode, setChartMode] = useState('line');

  useEffect(() => {
    async function loadData() {
      try {
        const [analyticsData, kpiData, performanceData] = await Promise.all([
          api.get('/api/dashboard/analytics'),
          api.get('/api/dashboard/kpis'),
          api.get('/api/dashboard/vehicle-performance'),
        ]);
        setAnalytics(analyticsData);
        setKpis(kpiData);
        setPerformanceRows(performanceData);
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
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // Filter vehicle listings
  const filteredVehicles = performanceRows.filter(v =>
    v.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.vehicle_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const fuelEfficiency = kpis?.fuel_efficiency ?? 0;
  const fleetUtilization = kpis?.fleet_utilization ?? 0;
  const operationalCost = kpis?.operational_cost ?? 0;
  const vehicleRoi = ((kpis?.vehicle_roi ?? 0) * 100).toFixed(1);

  const handleExport = async (type) => {
    setExportError('');
    setExporting(type);

    try {
      if (type === 'csv') {
        await api.download('/api/dashboard/reports/audit/export', 'transitops_audit_report.csv');
      } else {
        await api.download('/api/dashboard/reports/strategy/pdf', 'transitops_strategy_report.pdf');
      }
    } catch (err) {
      setExportError(err.message || 'Export failed.');
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left">
      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Fuel Efficiency</span>
            <span className="material-symbols-outlined text-outline text-lg">local_gas_station</span>
          </div>
          <div className="flex items-baseline gap-1 mt-4">
            <p className="font-headline text-3xl font-bold text-on-surface">{fuelEfficiency.toFixed(1)}</p>
            <span className="text-xs text-on-surface-variant font-medium">km/L</span>
          </div>
          <p className="text-[10px] text-on-surface-variant bg-surface-container border border-outline-variant px-2 py-0.5 rounded-full font-bold inline-block mt-2">
            {analytics?.completed_trips ?? 0} completed trips
          </p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Fleet Utilization</span>
            <span className="material-symbols-outlined text-outline text-lg">group_work</span>
          </div>
          <div className="flex items-baseline gap-1 mt-4">
            <p className="font-headline text-3xl font-bold text-on-surface">{fleetUtilization.toFixed(1)}</p>
            <span className="text-xs text-on-surface-variant font-medium">%</span>
          </div>
          <p className="text-[10px] text-on-surface-variant bg-surface-container border border-outline-variant px-2 py-0.5 rounded-full font-bold inline-block mt-2">
            {kpis?.active_trips ?? 0} active trips
          </p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Operational Cost</span>
            <span className="material-symbols-outlined text-outline text-lg">payments</span>
          </div>
          <div className="flex items-baseline gap-1 mt-4">
            <p className="font-headline text-3xl font-bold text-on-surface">{formatCurrency(operationalCost, { maximumFractionDigits: 0 })}</p>
            <span className="text-xs text-on-surface-variant font-medium">INR</span>
          </div>
          <p className="text-[10px] text-on-surface-variant bg-surface-container border border-outline-variant px-2 py-0.5 rounded-full font-bold inline-block mt-2">Live operating spend</p>
        </div>
      </div>

      {/* Strategic Exports Panel */}
      <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/60 shadow-sm space-y-6">
        <div className="border-b border-outline-variant/40 pb-4">
          <h3 className="font-headline text-2xl font-bold text-on-surface">
            Strategic Report Exports
          </h3>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Compile high-resolution datasets of fleet operations, fuel logs, and driver safety logs for compliance audits or strategic operations reviews.
          </p>
        </div>

        {exportError && (
          <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-semibold border border-error/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-error">report_problem</span>
            <span>{exportError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {hasRole(['admin', 'fleet_manager', 'financial_analyst', 'safety_officer']) ? (
            <>
              <button
                type="button"
                onClick={() => handleExport('csv')}
                disabled={Boolean(exporting)}
                className="w-full bg-surface-container-low border border-outline-variant/60 text-on-surface hover:border-primary hover:text-primary transition-all p-4 rounded-2xl flex items-center justify-between text-xs font-bold cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-lg text-primary">csv</span>
                  {exporting === 'csv' ? 'Preparing CSV...' : 'Export Audit CSV Dataset'}
                </span>
                <span className="material-symbols-outlined">download</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport('pdf')}
                disabled={Boolean(exporting)}
                className="w-full bg-surface-container-low border border-outline-variant/60 text-on-surface hover:border-primary hover:text-primary transition-all p-4 rounded-2xl flex items-center justify-between text-xs font-bold cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-lg text-primary">picture_as_pdf</span>
                  {exporting === 'pdf' ? 'Preparing PDF...' : 'Download Strategy PDF Report'}
                </span>
                <span className="material-symbols-outlined">download</span>
              </button>
            </>
          ) : (
            <p className="md:col-span-2 text-xs text-on-surface-variant bg-surface-container-low border border-outline-variant/40 rounded-xl p-4 font-medium">
              Your role has read-only report access. Exporting requires a management or audit role.
            </p>
          )}

          <div className="flex items-center gap-3 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20">
            <span className="p-2 bg-primary-fixed text-primary rounded-xl shrink-0">
              <span className="material-symbols-outlined text-lg">event_upcoming</span>
            </span>
            <div className="text-xs">
              <p className="font-bold text-on-surface">Next Audit Scheduled</p>
              <p className="text-on-surface-variant mt-0.5 font-medium">June 15, 2026</p>
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
                <th className="px-6 py-4 font-bold text-on-surface-variant uppercase tracking-wider font-label">Current Status</th>
                <th className="px-6 py-4 font-bold text-on-surface-variant uppercase tracking-wider font-label text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-on-surface-variant font-medium">
                    No matching vehicle performance records found.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  let statusClass = 'bg-surface-container text-on-surface-variant border border-outline-variant/30';
                  if (v.status === 'Available') statusClass = 'bg-green-50 text-green-700 border border-green-150';
                  if (v.status === 'On Trip') statusClass = 'bg-blue-50 text-blue-700 border border-blue-150';
                  if (v.status === 'In Shop') statusClass = 'bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary/10';

                  return (
                    <tr key={v.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-on-surface">{v.registration_number}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">{v.vehicle_name}</p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-on-surface">{v.fuel_efficiency.toFixed(1)} km/L</td>
                      <td className="px-6 py-4 font-semibold text-on-surface">{v.utilization_rate.toFixed(1)}%</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${statusClass}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => navigate('/vehicles')} title="Open vehicle registry" className="p-1 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-colors">
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
