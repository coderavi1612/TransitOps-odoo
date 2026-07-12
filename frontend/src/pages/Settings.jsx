import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { hasRole } = useAuth();
  
  const [rolesList, setRolesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('platform'); // 'platform', 'integrations', 'billing'

  // Settings states
  const [distanceUnit, setDistanceUnit] = useState('mi');
  const [weightUnit, setWeightUnit] = useState('lb');
  const [notifications, setNotifications] = useState({
    pushAlerts: true,
    emailSummaries: false,
    smsDispatch: true,
    slackSync: false,
  });

  const loadData = async () => {
    try {
      const rolesData = await api.get('/api/config/roles');
      setRolesList(rolesData);
    } catch (err) {
      console.error('Failed to load access roles:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
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

  // Fallback roles list
  const roles = rolesList.length ? rolesList : [
    { id: 1, name: 'System Administrator', active: true, access: 'Owner', users: 1 },
    { id: 2, name: 'Fleet Manager', active: true, access: 'Owner', users: 4 },
    { id: 3, name: 'Trip Dispatcher', active: true, access: 'Standard', users: 12 },
    { id: 4, name: 'Auditor / Viewer', active: true, access: 'Restricted', users: 3 },
  ];

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left">
      {/* Sub Tabs */}
      <div className="flex border-b border-outline-variant/60 gap-4 mb-6">
        <button
          onClick={() => setActiveTab('platform')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider font-label transition-colors border-b-2 cursor-pointer ${
            activeTab === 'platform' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
          }`}
        >
          Platform Settings
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider font-label transition-colors border-b-2 cursor-pointer ${
            activeTab === 'integrations' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
          }`}
        >
          Integrations
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider font-label transition-colors border-b-2 cursor-pointer ${
            activeTab === 'billing' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
          }`}
        >
          Billing
        </button>
      </div>

      {activeTab === 'platform' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Columns: RBAC Permissions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm">
              <div className="flex justify-between items-center border-b border-outline-variant/40 pb-4 mb-6 flex-wrap gap-4">
                <div>
                  <h3 className="font-headline text-2xl font-bold text-on-surface">Role-Based Access Control</h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">Define platform permissions for your operations teams.</p>
                </div>
                {hasRole(['admin']) && (
                  <button className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined text-base">person_add</span>
                    Create Role
                  </button>
                )}
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/60 bg-surface-container-low text-left">
                      <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Role Name</th>
                      <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Security Level</th>
                      <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Active Users</th>
                      <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label">Status</th>
                      <th className="px-4 py-3 font-bold text-on-surface-variant uppercase tracking-wider font-label text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {roles.map((role) => (
                      <tr key={role.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-4 py-4 flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-outline">admin_panel_settings</span>
                          <div>
                            <p className="font-bold text-on-surface">{role.name}</p>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">Full operational authority</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-on-surface">{role.access || 'Standard'}</td>
                        <td className="px-4 py-4 font-semibold text-on-surface">{role.users || 0} Operators</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-150 rounded-full font-semibold text-[10px]">
                            {role.active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button className="p-1 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Columns: Configurations */}
          <div className="lg:col-span-1 space-y-6">
            {/* System Units */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm space-y-4">
              <h4 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                <span className="material-symbols-outlined text-primary text-xl">square_foot</span>
                System Units
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Configure global measurement standards used across trips, dispatcher calculations, and metrics.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Distance</label>
                  <select
                    value={distanceUnit}
                    onChange={(e) => setDistanceUnit(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    <option value="mi">Miles (mi)</option>
                    <option value="km">Kilometers (km)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Weight</label>
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    <option value="lb">Pounds (lb)</option>
                    <option value="kg">Kilograms (kg)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Smart Notifications */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
                <h4 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">notifications_active</span>
                  Notifications
                </h4>
                <button className="text-[10px] font-bold text-primary hover:underline">Reset</button>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 cursor-pointer select-none">
                  <div>
                    <p className="text-xs font-bold text-on-surface">Push Alerts</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">Real-time browser notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.pushAlerts}
                    onChange={() => handleNotificationChange('pushAlerts')}
                    className="w-4 h-4 rounded border-outline text-primary focus:ring-primary accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 cursor-pointer select-none">
                  <div>
                    <p className="text-xs font-bold text-on-surface">Email Summaries</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">Weekly performance analysis</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailSummaries}
                    onChange={() => handleNotificationChange('emailSummaries')}
                    className="w-4 h-4 rounded border-outline text-primary focus:ring-primary accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 cursor-pointer select-none">
                  <div>
                    <p className="text-xs font-bold text-on-surface">SMS Dispatch Texts</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">Critical delay mobile updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.smsDispatch}
                    onChange={() => handleNotificationChange('smsDispatch')}
                    className="w-4 h-4 rounded border-outline text-primary focus:ring-primary accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 cursor-pointer select-none">
                  <div>
                    <p className="text-xs font-bold text-on-surface">Slack Workspace Sync</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">Automated operations relay</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.slackSync}
                    onChange={() => handleNotificationChange('slackSync')}
                    className="w-4 h-4 rounded border-outline text-primary focus:ring-primary accent-primary"
                  />
                </label>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm space-y-4">
              <h4 className="font-headline text-xl font-bold text-tertiary flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                <span className="material-symbols-outlined text-tertiary text-xl">shield</span>
                Data Integrity
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Archiving or deleting system databases will remove historical logs and dispatch manifests permanently.
              </p>
              {hasRole(['admin']) && (
                <button className="w-full bg-tertiary-container/30 hover:bg-tertiary text-tertiary hover:text-white font-bold py-3 rounded-xl text-xs transition-all cursor-pointer">
                  Archive Historical logs
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/60 shadow-sm text-center py-12">
          <span className="material-symbols-outlined text-primary text-5xl mb-4">construction</span>
          <h3 className="font-headline text-2xl font-bold text-on-surface">Settings Module</h3>
          <p className="text-on-surface-variant text-xs mt-2">The selected settings tab is currently undergoing alignment.</p>
        </div>
      )}
    </div>
  );
}
