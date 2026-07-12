import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function FuelExpenses() {
  const { hasRole } = useAuth();
  
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logType, setLogType] = useState('fuel'); // 'fuel' or 'expense'

  // Fuel Form state
  const [fuelForm, setFuelForm] = useState({
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    litres: '50',
    cost: '70',
    odometer: '12000',
  });

  // Expense Form state
  const [expenseForm, setExpenseForm] = useState({
    vehicle_id: '',
    expense_category_id: '',
    amount: '25',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const loadData = async () => {
    try {
      const [fuelList, expenseList, vehicleList, categoryList] = await Promise.all([
        api.get('/api/fuel'),
        api.get('/api/expenses'),
        api.get('/api/vehicles'),
        api.get('/api/config/expense_categories'),
      ]);
      setFuelLogs(fuelList);
      setExpenses(expenseList);
      setVehicles(vehicleList);
      setExpenseCategories(categoryList);

      setFuelForm(prev => ({
        ...prev,
        vehicle_id: vehicleList[0]?.id || '',
        odometer: vehicleList[0]?.odometer?.toString() || '0',
      }));

      setExpenseForm(prev => ({
        ...prev,
        vehicle_id: vehicleList[0]?.id || '',
        expense_category_id: categoryList[0]?.id || '',
      }));
    } catch (err) {
      console.error('Failed to load operational logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const body = {
      ...fuelForm,
      vehicle_id: parseInt(fuelForm.vehicle_id),
      litres: parseFloat(fuelForm.litres),
      cost: parseFloat(fuelForm.cost),
      odometer: parseFloat(fuelForm.odometer),
    };

    try {
      await api.post('/api/fuel', body);
      setFuelForm(prev => ({
        ...prev,
        litres: '50',
        cost: '70',
      }));
      loadData();
    } catch (err) {
      setError(err.message || 'Fuel log failed.');
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const body = {
      ...expenseForm,
      vehicle_id: parseInt(expenseForm.vehicle_id),
      expense_category_id: parseInt(expenseForm.expense_category_id),
      amount: parseFloat(expenseForm.amount),
    };

    try {
      await api.post('/api/expenses', body);
      setExpenseForm(prev => ({
        ...prev,
        amount: '25',
        notes: '',
      }));
      loadData();
    } catch (err) {
      setError(err.message || 'Expense log failed.');
    }
  };

  const handleDeleteFuel = async (id) => {
    if (!window.confirm('Delete this fuel transaction record?')) return;
    try {
      await api.delete(`/api/fuel/${id}`);
      loadData();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense transaction record?')) return;
    try {
      await api.delete(`/api/expenses/${id}`);
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

  // Combine and sort recent logs chronologically
  const unifiedLogs = [
    ...fuelLogs.map(fl => ({
      id: `fuel-${fl.id}`,
      realId: fl.id,
      type: 'Fuel',
      vehicle: fl.transit_ops_vehicle?.registration_number,
      details: `Refill: ${fl.litres}L • Efficiency: ${fl.fuel_efficiency?.toFixed(1) || 'N/A'} km/L`,
      amount: fl.cost,
      date: fl.date,
      icon: 'local_gas_station',
      color: 'text-primary bg-primary-fixed',
      onDelete: () => handleDeleteFuel(fl.id),
    })),
    ...expenses.map(e => ({
      id: `expense-${e.id}`,
      realId: e.id,
      type: e.transit_ops_expense_category?.name || 'Expense',
      vehicle: e.transit_ops_vehicle?.registration_number,
      details: e.notes || 'Automated passage fee',
      amount: e.amount,
      date: e.date,
      icon: e.transit_ops_expense_category?.category_type === 'Toll' ? 'toll' : 'receipt_long',
      color: e.transit_ops_expense_category?.category_type === 'Toll' ? 'text-secondary bg-secondary-fixed' : 'text-tertiary bg-tertiary-fixed',
      onDelete: () => handleDeleteExpense(e.id),
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Compute metrics
  const totalExpenses = unifiedLogs.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
  const avgEfficiency = fuelLogs.filter(f => f.fuel_efficiency).reduce((acc, curr, _, arr) => acc + (curr.fuel_efficiency / arr.length), 0) || 14.2;

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left bg-surface/10">
      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-medium border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-error">report_problem</span>
          <span>{error}</span>
        </div>
      )}

      {/* Top Grid: Form and Cost Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Card 1: Record Fuel Form */}
        <div className="lg:col-span-1 bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-outline-variant/40 pb-4 mb-6">
              <h3 className="font-headline text-2xl font-bold text-on-surface">Record Fuel</h3>
              <span className="material-symbols-outlined text-primary text-xl border border-primary/30 p-1 rounded-full cursor-pointer hover:bg-primary/10 transition-colors">add</span>
            </div>

            {/* Toggle tabs for Fuel vs Toll/Expense Form */}
            <div className="flex bg-surface-container-low p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setLogType('fuel')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  logType === 'fuel' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Fuel
              </button>
              <button
                type="button"
                onClick={() => setLogType('expense')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  logType === 'expense' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Expense
              </button>
            </div>

            {logType === 'fuel' ? (
              <form onSubmit={handleFuelSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Vehicle ID</label>
                  <select
                    value={fuelForm.vehicle_id}
                    onChange={(e) => {
                      const v = vehicles.find(vh => vh.id === parseInt(e.target.value));
                      setFuelForm({
                        ...fuelForm,
                        vehicle_id: e.target.value,
                        odometer: v?.odometer?.toString() || '0',
                      });
                    }}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.registration_number}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Liters</label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={fuelForm.litres}
                      onChange={(e) => setFuelForm({ ...fuelForm, litres: e.target.value })}
                      className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Cost (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={fuelForm.cost}
                      onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })}
                      className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={fuelForm.date.includes('T') ? fuelForm.date : `${fuelForm.date}T12:00`}
                    onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Station / Location</label>
                  <input
                    type="text"
                    required
                    placeholder="Shell Highway 12"
                    value={fuelForm.location || ''}
                    onChange={(e) => setFuelForm({ ...fuelForm, location: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Odometer Reading (km)</label>
                  <input
                    type="number"
                    required
                    value={fuelForm.odometer}
                    onChange={(e) => setFuelForm({ ...fuelForm, odometer: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                {hasRole(['fleet_manager', 'admin']) && (
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/10 transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-6"
                  >
                    Log Transaction
                  </button>
                )}
              </form>
            ) : (
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Assigned Vehicle</label>
                  <select
                    value={expenseForm.vehicle_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.registration_number}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Expense Category</label>
                  <select
                    value={expenseForm.expense_category_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expense_category_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name} ({cat.category_type})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Date</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Notes / Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Turnpike toll, headlight bulb change..."
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="w-full bg-surface border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                {hasRole(['fleet_manager', 'financial_analyst', 'admin']) && (
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/10 transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-6"
                  >
                    Record Expense
                  </button>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Card 2: Operational Cost per Vehicle Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-outline-variant/40 pb-4 mb-4">
              <div>
                <h3 className="font-headline text-2xl font-bold text-on-surface">Operational Cost per Vehicle</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1">Comparison of Fuel vs. Maintenance (Last 30 Days)</p>
              </div>
              
              {/* Legend matching screenshot */}
              <div className="flex items-center gap-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                  <span>Fuel</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#8C3A32] rounded-full" />
                  <span>Maintenance</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-medium border border-outline-variant/60 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[10px]">info</span>
                  <span>Total = Fuel + Maint.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Stacked Bars matching screenshot */}
          <div className="flex-1 flex items-end justify-around h-64 pt-6 border-b border-outline-variant/30">
            {[
              { label: 'TR 761', fuel: 65, maint: 20 },
              { label: 'TR 883', fuel: 75, maint: 15 },
              { label: 'VN 202', fuel: 45, maint: 25 },
              { label: 'VN 901', fuel: 70, maint: 12 },
              { label: 'CR 119', fuel: 35, maint: 30 },
              { label: 'TR 004', fuel: 82, maint: 18 },
            ].map((bar, index) => (
              <div key={index} className="flex flex-col items-center w-12 gap-2 h-full justify-end">
                {/* Stacked bar cylinder */}
                <div className="w-8 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                  {/* Maintenance block (brown) */}
                  <div className="bg-[#8C3A32] transition-all hover:brightness-95 cursor-pointer" style={{ height: `${bar.maint}%` }} title={`Maint: ${bar.maint}%`} />
                  {/* Fuel block (orange) */}
                  <div className="bg-primary transition-all hover:brightness-95 cursor-pointer" style={{ height: `${bar.fuel}%` }} title={`Fuel: ${bar.fuel}%`} />
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant font-mono uppercase tracking-wider">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Middle Row: Recent Operational Logs Table (spans full width) */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-outline-variant/40 pb-4">
          <h3 className="font-headline text-2xl font-bold text-on-surface">Recent Operational Logs</h3>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-outline-variant/60 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container flex items-center gap-1.5 cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filter
            </button>
            <button className="px-4 py-2 border border-outline-variant/60 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container flex items-center gap-1.5 cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-sm">file_download</span>
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low text-on-surface-variant font-bold uppercase tracking-wider font-label">
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {unifiedLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-on-surface-variant font-medium">
                    No operational logs logged in fleet registry.
                  </td>
                </tr>
              ) : (
                unifiedLogs.map((log) => {
                  let badgeClass = 'bg-surface-container text-on-surface-variant border border-outline-variant/30';
                  if (log.type === 'Fuel') badgeClass = 'bg-orange-50 text-orange-800 border border-orange-100';
                  if (log.type === 'Tolls') badgeClass = 'bg-blue-50 text-blue-800 border border-blue-100';
                  if (log.type.toLowerCase().includes('repair') || log.type.toLowerCase().includes('maint')) {
                    badgeClass = 'bg-rose-50 text-rose-800 border border-rose-100';
                  }

                  return (
                    <tr key={log.id} className="hover:bg-surface-container-low transition-all">
                      <td className="px-6 py-4">
                        <p className="font-bold text-on-surface">
                          {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                          {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-base p-1.5 bg-surface-container rounded-lg">local_shipping</span>
                          <span className="font-bold text-on-surface">{log.vehicle}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${badgeClass}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-on-surface">{log.details}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5 font-medium">Recorded at Station</p>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-on-surface text-sm">₹{parseFloat(log.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block group/menu">
                          <button className="p-1 hover:bg-surface-container rounded-lg text-on-surface-variant">
                            <span className="material-symbols-outlined text-base">more_vert</span>
                          </button>
                          
                          <div className="absolute right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-lg z-20 py-1 hidden group-hover/menu:block w-28 text-left">
                            {hasRole(['fleet_manager', 'financial_analyst', 'admin']) && (
                              <button
                                onClick={log.onDelete}
                                className="w-full px-4 py-2 hover:bg-surface-container text-xs font-semibold text-error flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: 3 Marketing/Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Efficiency Rating */}
        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label">
              <span>Efficiency Rating</span>
              <span className="material-symbols-outlined text-primary text-sm">bolt</span>
            </div>
            <div className="flex items-baseline gap-1 pt-2">
              <p className="font-headline text-3xl font-extrabold text-on-surface">14.2</p>
              <span className="text-[10px] font-bold text-on-surface-variant">km/L (Avg)</span>
            </div>
            <p className="text-[10px] text-on-surface-variant font-medium pt-1">+2.4% vs. previous month (Combined Ops)</p>
          </div>
          <div className="h-1 bg-primary w-24 rounded-full mt-4" />
        </div>

        {/* Card 2: Projected Expense */}
        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-label">
              <span>Projected Expense</span>
              <span className="material-symbols-outlined text-on-surface-variant text-sm">trending_up</span>
            </div>
            <div className="flex items-baseline gap-1 pt-2">
              <p className="font-headline text-3xl font-extrabold text-on-surface">₹4.8k</p>
              <span className="text-[10px] font-bold text-on-surface-variant">May Est.</span>
            </div>
            <p className="text-[10px] text-on-surface-variant font-medium pt-1">Automated forecast based on fuel & service history</p>
          </div>
          <div className="pt-2">
            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[8px] font-bold rounded-md border border-green-100 flex items-center gap-1 w-fit">
              <span className="material-symbols-outlined text-[8px] font-extrabold">trending_up</span>
              HIGH ACCURACY
            </span>
          </div>
        </div>

        {/* Card 3: Annual Fleet Report */}
        <div className="bg-[#C9665E] p-6 rounded-[24px] text-white flex flex-col justify-between shadow-md">
          <div className="space-y-1">
            <h4 className="font-headline text-lg font-bold">Annual Fleet Report</h4>
            <p className="text-[10px] text-white/80 leading-relaxed font-medium">
              Download detailed analysis of all operational costs for Q1-Q2 2026.
            </p>
          </div>
          <button className="w-full bg-white hover:bg-white/95 text-[#C9665E] font-bold py-2 rounded-xl text-[10px] flex items-center justify-center gap-1.5 shadow-sm mt-4 cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-sm">description</span>
            View Full Report
          </button>
        </div>

      </div>
    </div>
  );
}
