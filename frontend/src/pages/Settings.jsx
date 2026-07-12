import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SETTINGS = {
  distance_unit: 'km',
  weight_unit: 'kg',
  currency: 'INR',
  notifications: {
    pushAlerts: true,
    emailSummaries: false,
    smsDispatch: true,
    slackSync: false,
  },
};

const NOTIFICATION_OPTIONS = [
  ['pushAlerts', 'Push Alerts', 'Real-time browser notifications'],
  ['smsDispatch', 'SMS Dispatch', 'Critical delay text alerts'],
  ['emailSummaries', 'Email Summaries', 'Weekly performance insights'],
  ['slackSync', 'Slack Sync', 'Enterprise channel relay'],
];

const roleAccess = (role) => {
  if (role.key === 'admin') return ['Owner', 'Full system authority'];
  if (role.key === 'fleet_manager') return ['Manager', 'Fleet and maintenance management'];
  if (role.key === 'dispatcher') return ['Standard', 'Trip dispatch and routing'];
  if (role.key === 'driver') return ['Restricted', 'Assigned trips and expenses'];
  if (role.key === 'safety_officer') return ['Standard', 'Driver safety management'];
  if (role.key === 'financial_analyst') return ['Standard', 'Financial logs and reports'];
  return ['Catalogue', 'Custom role catalogue entry'];
};

export default function Settings() {
  const { hasRole, profile, user, logout, roles: userRoles } = useAuth();
  const [roles, setRoles] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [roleModal, setRoleModal] = useState(null);

  const isAdmin = hasRole(['admin']);

  const formatRole = () => {
    if (userRoles.includes('admin')) return 'Administrator';
    return (userRoles[0] || 'user').split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
  };

  const loadData = async () => {
    setError('');
    try {
      const [rolesData, settingsData] = await Promise.all([
        api.get('/api/config/roles'),
        api.get('/api/config/settings'),
      ]);
      setRoles(rolesData);
      setSettings({ ...DEFAULT_SETTINGS, ...settingsData, notifications: { ...DEFAULT_SETTINGS.notifications, ...settingsData.notifications } });
    } catch (err) {
      setError(err.message || 'Failed to load platform settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveSettings = async (nextSettings) => {
    if (!isAdmin) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await api.put('/api/config/settings', {
        distance_unit: 'km',
        weight_unit: nextSettings.weight_unit,
        currency: 'INR',
        notifications: nextSettings.notifications,
      });
      setSettings(saved);
      setMessage('Platform settings saved.');
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotification = (key) => {
    const next = {
      ...settings,
      notifications: { ...settings.notifications, [key]: !settings.notifications[key] },
    };
    setSettings(next);
    saveSettings(next);
  };

  const resetNotifications = () => {
    const next = { ...settings, notifications: DEFAULT_SETTINGS.notifications };
    setSettings(next);
    saveSettings(next);
  };

  const saveRole = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { name: roleModal.name.trim(), active: roleModal.active };
      if (roleModal.id) await api.put(`/api/config/roles/${roleModal.id}`, body);
      else await api.post('/api/config/roles', body);
      setRoleModal(null);
      await loadData();
      setMessage('Role catalogue updated.');
    } catch (err) {
      setError(err.message || 'Failed to update role.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-8 text-primary font-bold">Loading settings…</div>;
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full text-left">
      {(error || message) && (
        <div className={`p-4 rounded-xl text-xs font-semibold border ${error ? 'bg-error-container text-on-error-container border-error/20' : 'bg-green-50 text-green-800 border-green-200'}`}>
          {error || message}
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-6 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-outline-variant" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xl">
              {(profile?.full_name || user?.email || 'T').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <span className="px-2.5 py-0.5 bg-primary-container text-on-primary-container text-[9px] font-bold rounded-md uppercase tracking-wider">{formatRole()}</span>
            <h3 className="font-headline text-xl font-bold text-on-surface mt-1">{profile?.full_name || 'TransitOps Operator'}</h3>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="px-4 py-2 border border-tertiary/60 rounded-xl text-xs font-bold text-tertiary hover:bg-tertiary-container flex items-center gap-1.5 cursor-pointer">
          <span className="material-symbols-outlined text-sm">logout</span> Log Out
        </button>
      </div>

      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm">
        <div className="flex flex-wrap justify-between items-center border-b border-outline-variant/40 pb-4 mb-6 gap-4">
          <div>
            <h3 className="font-headline text-2xl font-bold text-on-surface">Role-Based Access Control</h3>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">Database-backed role catalogue and current user counts.</p>
          </div>
          {isAdmin && (
            <button onClick={() => setRoleModal({ name: '', active: true })} className="bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer">
              <span className="material-symbols-outlined text-base">person_add</span> Create New Role
            </button>
          )}
        </div>
        <div className="overflow-x-auto text-xs">
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-outline-variant/60 bg-surface-container-low text-left text-on-surface-variant font-bold uppercase tracking-wider">
              <th className="px-6 py-3">Role Name</th><th className="px-6 py-3">Access Level</th><th className="px-6 py-3">Users</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-outline-variant/40">
              {roles.map((role) => {
                const [access, description] = roleAccess(role);
                return (
                  <tr key={role.id} className="hover:bg-surface-container-low">
                    <td className="px-6 py-4"><p className="font-bold text-on-surface text-sm">{role.name}</p><p className="text-[10px] text-on-surface-variant mt-0.5">{description}</p></td>
                    <td className="px-6 py-4"><span className="bg-on-surface text-surface px-3 py-1 rounded-md text-[9px] font-extrabold uppercase">{access}</span></td>
                    <td className="px-6 py-4 font-bold text-on-surface">{role.users || 0}</td>
                    <td className="px-6 py-4"><span className={`font-semibold ${role.active ? 'text-primary' : 'text-on-surface-variant'}`}>● {role.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-6 py-4 text-right">{isAdmin && <button onClick={() => setRoleModal({ id: role.id, name: role.name, active: role.active })} className="p-1.5 hover:bg-surface-container-high rounded-lg cursor-pointer" aria-label={`Edit ${role.name}`}><span className="material-symbols-outlined text-base">edit</span></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm">
          <span className="material-symbols-outlined text-primary">square_foot</span>
          <h3 className="font-headline text-2xl font-bold text-on-surface mt-3">System Units</h3>
          <p className="text-xs text-on-surface-variant font-medium mt-1">Indian logistics standards are enforced globally.</p>
          <div className="space-y-4 mt-6">
            <label className="block text-[10px] font-bold uppercase text-on-surface-variant">Distance<input value="Kilometres (km)" disabled className="mt-1.5 w-full bg-surface-container border rounded-xl px-4 py-3 text-xs font-bold" /></label>
            <label className="block text-[10px] font-bold uppercase text-on-surface-variant">Weight
              <select value={settings.weight_unit} disabled={!isAdmin || saving} onChange={(event) => { const next = { ...settings, weight_unit: event.target.value }; setSettings(next); saveSettings(next); }} className="mt-1.5 w-full bg-surface border rounded-xl px-4 py-3 text-xs font-bold cursor-pointer">
                <option value="kg">Kilograms (kg)</option><option value="tonne">Metric tonnes (t)</option>
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase text-on-surface-variant">Currency<input value="Indian Rupee (INR / ₹)" disabled className="mt-1.5 w-full bg-surface-container border rounded-xl px-4 py-3 text-xs font-bold" /></label>
          </div>
        </section>

        <section className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/60 rounded-[32px] p-8 shadow-sm">
          <div className="flex justify-between items-center border-b border-outline-variant/40 pb-4 mb-6">
            <div><h3 className="font-headline text-2xl font-bold text-on-surface">Smart Notifications</h3><p className="text-xs text-on-surface-variant mt-1">Saved centrally for the platform.</p></div>
            {isAdmin && <button onClick={resetNotifications} disabled={saving} className="px-4 py-2 border border-outline rounded-xl text-xs font-bold cursor-pointer">Reset Defaults</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {NOTIFICATION_OPTIONS.map(([key, label, description]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div><p className="text-sm font-bold text-on-surface">{label}</p><p className="text-[10px] text-on-surface-variant mt-0.5">{description}</p></div>
                <button type="button" disabled={!isAdmin || saving} onClick={() => toggleNotification(key)} aria-pressed={settings.notifications[key]} className={`w-11 h-6 rounded-full p-1 transition-colors ${settings.notifications[key] ? 'bg-primary' : 'bg-outline-variant'} disabled:opacity-60 cursor-pointer flex items-center`}>
                  <span className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${settings.notifications[key] ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {roleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={saveRole} className="bg-surface-container-lowest rounded-[28px] border border-outline-variant p-7 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex justify-between"><h3 className="font-headline text-xl font-bold">{roleModal.id ? 'Edit Role' : 'Create Role'}</h3><button type="button" onClick={() => setRoleModal(null)}><span className="material-symbols-outlined">close</span></button></div>
            <label className="block text-xs font-bold">Role name<input required minLength="2" value={roleModal.name} onChange={(event) => setRoleModal({ ...roleModal, name: event.target.value })} className="mt-2 w-full border rounded-xl px-4 py-3 font-medium" /></label>
            <label className="flex items-center gap-3 text-xs font-bold"><input type="checkbox" checked={roleModal.active} onChange={(event) => setRoleModal({ ...roleModal, active: event.target.checked })} /> Active</label>
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setRoleModal(null)} className="px-5 py-2.5 border rounded-xl text-xs font-bold">Cancel</button><button disabled={saving} type="submit" className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold">{saving ? 'Saving…' : 'Save Role'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
