import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { hasRole, profile, user, logout, roles: userRoles } = useAuth();
  
  const formatRole = () => {
    if (!userRoles) return 'User';
    if (userRoles.includes('admin')) return 'Administrator';
    if (userRoles.includes('fleet_manager')) return 'Manager';
    if (userRoles.includes('driver')) return 'Driver';
    if (userRoles.includes('safety_officer')) return 'Safety';
    if (userRoles.includes('financial_analyst')) return 'Analyst';
    return userRoles[0] || 'User';
  };
  
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
      <div className="space-y-8">

        {/* Current User Profile Banner */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-outline-variant" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xl">
                {(profile?.full_name || 'F').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <span className="px-2.5 py-0.5 bg-primary-container text-on-primary-container text-[9px] font-bold rounded-md border border-primary/10 uppercase tracking-wider">
                {formatRole()}
              </span>
              <h3 className="font-headline text-xl font-bold text-on-surface mt-1">{profile?.full_name || 'Fleet Operator'}</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">{user?.email || 'operator@transitops.com'}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="px-4 py-2 border border-tertiary/60 rounded-xl text-xs font-bold text-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Log Out
          </button>
        </div>
        
        {/* Top Section: Role-Based Access Control (Full Width) */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm">
          <div className="flex flex-wrap justify-between items-center border-b border-outline-variant/40 pb-4 mb-6 gap-4">
            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface">Role-Based Access Control</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">Define permissions for your dispatching and management teams.</p>
            </div>
            {hasRole(['admin']) && (
              <button className="bg-primary text-white text-xs font-bold pl-4 pr-5 py-2.5 rounded-xl shadow-lg shadow-primary/10 hover:bg-primary/95 transition-all flex items-center gap-1.5 cursor-pointer">
                <span className="material-symbols-outlined text-base">person_add</span>
                Create New Role
              </button>
            )}
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/60 bg-surface-container-low text-left text-on-surface-variant font-bold uppercase tracking-wider font-label">
                  <th className="px-6 py-3">Role Name</th>
                  <th className="px-6 py-3">Access Level</th>
                  <th className="px-6 py-3">Users</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {/* Row 1: Fleet Manager */}
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 flex items-center gap-4">
                    <div className="p-2.5 bg-orange-50 text-orange-800 rounded-xl border border-orange-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">shield</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-sm">Fleet Manager</p>
                      <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Full system authority</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-[#2D2D2D] text-white px-3 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider">
                      Owner
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center -space-x-2 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-[#E5DFD9] border-2 border-surface flex items-center justify-center" />
                      <div className="w-6 h-6 rounded-full bg-[#D8D0C7] border-2 border-surface flex items-center justify-center" />
                      <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-800 border-2 border-surface text-[8px] font-bold flex items-center justify-center shadow-sm shrink-0">
                        +2
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Active
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                  </td>
                </tr>

                {/* Row 2: Trip Dispatcher */}
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 flex items-center gap-4">
                    <div className="p-2.5 bg-surface-container text-on-surface-variant rounded-xl border border-outline-variant/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">conversion_path</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-sm">Trip Dispatcher</p>
                      <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Routing and Driver management</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-[#7B7B7B] text-white px-3 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider">
                      Standard
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center -space-x-2 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-[#E5DFD9] border-2 border-surface flex items-center justify-center" />
                      <div className="w-6 h-6 rounded-full bg-[#D8D0C7] border-2 border-surface flex items-center justify-center" />
                      <div className="w-6 h-6 rounded-full bg-[#C8BEB2] border-2 border-surface flex items-center justify-center" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Active
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                  </td>
                </tr>

                {/* Row 3: Auditor / Viewer */}
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 flex items-center gap-4">
                    <div className="p-2.5 bg-surface-container text-on-surface-variant rounded-xl border border-outline-variant/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-sm">Auditor / Viewer</p>
                      <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Read-only report access</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-[#A3A3A3] text-white px-3 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider">
                      Restricted
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center -space-x-2 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-[#E5DFD9] border-2 border-surface flex items-center justify-center" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
                      <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                      Inherited
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Grid: System Units & Smart Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: System Units (1/3 width) */}
          <div className="lg:col-span-1 bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 flex items-center justify-center w-fit">
                <span className="material-symbols-outlined text-lg">square_foot</span>
              </div>
              <div>
                <h3 className="font-headline text-2xl font-bold text-on-surface">System Units</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1 leading-relaxed">
                  Configure global measurement standards for all logistics calculations.
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Distance</label>
                <select
                  value={distanceUnit}
                  onChange={(e) => setDistanceUnit(e.target.value)}
                  className="w-full bg-[#F5EFE9] border border-outline-variant/60 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface font-bold cursor-pointer"
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
                  className="w-full bg-[#F5EFE9] border border-outline-variant/60 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface font-bold cursor-pointer"
                >
                  <option value="lb">Pounds (lb)</option>
                  <option value="kg">Kilograms (kg)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Column 2: Smart Notifications (2/3 width) */}
          <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-outline-variant/40 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-50 text-orange-800 rounded-xl border border-orange-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">notifications</span>
                  </div>
                  <div>
                    <h3 className="font-headline text-2xl font-bold text-on-surface">Smart Notifications</h3>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">Control how the platform communicates critical updates.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setNotifications({ pushAlerts: true, emailSummaries: false, smsDispatch: true, slackSync: true })}
                  className="px-4 py-2 border border-outline rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer transition-colors"
                >
                  Reset Defaults
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 pt-2">
                {/* Toggle 1: Push Alerts */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Push Alerts</p>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Real-time browser notifications</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange('pushAlerts')}
                    className={`w-11 h-6 rounded-full p-1 transition-colors ${notifications.pushAlerts ? 'bg-[#C2622A]' : 'bg-[#DCD5CD]'} cursor-pointer flex items-center`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notifications.pushAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Toggle 2: SMS Dispatch */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-on-surface">SMS Dispatch</p>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Critical delay text alerts</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange('smsDispatch')}
                    className={`w-11 h-6 rounded-full p-1 transition-colors ${notifications.smsDispatch ? 'bg-[#C2622A]' : 'bg-[#DCD5CD]'} cursor-pointer flex items-center`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notifications.smsDispatch ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Toggle 3: Email Summaries */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Email Summaries</p>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Weekly performance insights</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange('emailSummaries')}
                    className={`w-11 h-6 rounded-full p-1 transition-colors ${notifications.emailSummaries ? 'bg-[#C2622A]' : 'bg-[#DCD5CD]'} cursor-pointer flex items-center`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notifications.emailSummaries ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Toggle 4: Slack Sync */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Slack Sync</p>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Enterprise channel relay</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange('slackSync')}
                    className={`w-11 h-6 rounded-full p-1 transition-colors ${notifications.slackSync ? 'bg-[#C2622A]' : 'bg-[#DCD5CD]'} cursor-pointer flex items-center`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notifications.slackSync ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
