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
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Fuel Efficiency</span>
            <p className="font-headline text-3xl font-bold text-on-surface mt-2">{avgEfficiency.toFixed(1)} km/L</p>
            <p className="text-xs text-on-surface-variant mt-1.5 font-medium">Combined fleet average rating</p>
          </div>
          <span className="material-symbols-outlined text-primary text-3xl p-3 bg-primary-fixed rounded-full">bolt</span>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">Logged Expenses</span>
            <p className="font-headline text-3xl font-bold text-on-surface mt-2">${totalExpenses.toLocaleString()}</p>
            <p className="text-xs text-on-surface-variant mt-1.5 font-medium">Refuels, Tolls, and Maintenance bills</p>
          </div>
          <span className="material-symbols-outlined text-secondary text-3xl p-3 bg-secondary-fixed rounded-full">payments</span>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/40 shadow-sm bg-gradient-to-br from-primary/5 to-transparent flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider font-label">Annual Report</span>
            <p className="font-headline text-xl font-bold text-on-surface mt-2">Q1-Q2 Strategy Audit</p>
            <button className="text-[10px] font-bold text-primary hover:underline mt-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">description</span>
              Download PDF Report
            </button>
          </div>
          <span className="material-symbols-outlined text-primary text-3xl p-3 bg-primary-fixed rounded-full">download</span>
        </div>
      </div>

      {/* Forms & Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Forms */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm">
            {/* Form Toggle Tabs */}
            <div className="flex border-b border-outline-variant/40 mb-6">
              <button
                onClick={() => setLogType('fuel')}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider font-label transition-colors border-b-2 cursor-pointer ${
                  logType === 'fuel' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
                }`}
              >
                Log Fuel Fill
              </button>
              <button
                onClick={() => setLogType('expense')}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider font-label transition-colors border-b-2 cursor-pointer ${
                  logType === 'expense' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
                }`}
              >
                Log Toll/Expense
              </button>
            </div>

            {logType === 'fuel' ? (
              /* Fuel Form */
              <form onSubmit={handleFuelSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Assigned Vehicle</label>
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
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.registration_number} ({v.vehicle_name})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Liters</label>
                    <input
                      type="number"
                      required
                      value={fuelForm.litres}
                      onChange={(e) => setFuelForm({ ...fuelForm, litres: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Total Cost ($)</label>
                    <input
                      type="number"
                      required
                      value={fuelForm.cost}
                      onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Odometer Reading (mi)</label>
                    <input
                      type="number"
                      required
                      value={fuelForm.odometer}
                      onChange={(e) => setFuelForm({ ...fuelForm, odometer: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Date</label>
                    <input
                      type="date"
                      required
                      value={fuelForm.date}
                      onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                </div>

                {hasRole(['fleet_manager', 'admin']) && (
                  <button
                    type="submit"
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                  >
                    <span className="material-symbols-outlined text-base">local_gas_station</span>
                    Record Refueling
                  </button>
                )}
              </form>
            ) : (
              /* Expense Form */
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Assigned Vehicle</label>
                  <select
                    value={expenseForm.vehicle_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.registration_number} ({v.vehicle_name})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Expense Category</label>
                  <select
                    value={expenseForm.expense_category_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expense_category_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name} ({cat.category_type})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Amount ($)</label>
                    <input
                      type="number"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Date</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
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
                    className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>

                {hasRole(['fleet_manager', 'financial_analyst', 'admin']) && (
                  <button
                    type="submit"
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                  >
                    <span className="material-symbols-outlined text-base">receipt_long</span>
                    Record Expense
                  </button>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Right Side: Ledger Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm">
            <h3 className="font-headline text-2xl font-bold text-on-surface border-b border-outline-variant/40 pb-4 mb-6">
              Recent Operational Logs
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/60 bg-surface-container-low text-left">
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Date & Time</th>
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Vehicle</th>
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Type</th>
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Transaction Details</th>
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Amount</th>
                    <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {unifiedLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-on-surface-variant font-medium">
                        No refueling or operational expense receipts logged.
                      </td>
                    </tr>
                  ) : (
                    unifiedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-container-low transition-all">
                        <td className="px-4 py-3.5 font-medium text-on-surface">{new Date(log.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3.5 font-bold text-on-surface">{log.vehicle}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${log.color}`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-on-surface-variant font-medium">{log.details}</td>
                        <td className="px-4 py-3.5 font-bold text-on-surface">${parseFloat(log.amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right">
                          {hasRole(['fleet_manager', 'financial_analyst', 'admin']) && (
                            <button
                              onClick={log.onDelete}
                              className="p-1 hover:bg-tertiary-container/30 text-on-surface-variant hover:text-tertiary rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
