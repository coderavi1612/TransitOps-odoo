import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/vehicles', label: 'Vehicle Registry', icon: 'local_shipping' },
    { to: '/drivers', label: 'Driver Management', icon: 'person_pin' },
    { to: '/trips', label: 'Trip Dispatcher', icon: 'route' },
    { to: '/maintenance', label: 'Maintenance', icon: 'build' },
    { to: '/fuel-expenses', label: 'Fuel & Expenses', icon: 'local_gas_station' },
    { to: '/reports', label: 'Reports', icon: 'assessment' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-surface-container border-r border-outline-variant/60 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Section */}
      <div className="p-6 border-b border-outline-variant/40">
        <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight leading-none">Sahara Fleet</h1>
        <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mt-1.5 font-bold">Enterprise Control</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/10'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-xl group-[.active]:text-white">
              {link.icon}
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Fleetly+ Upgrade & Footer Actions */}
      <div className="p-4 border-t border-outline-variant/40 space-y-4">
        {/* Support & Logout */}
        <div className="space-y-1">
          <a
            href="mailto:support@saharafleet.com"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
          >
            <span className="material-symbols-outlined text-base">help</span>
            <span>Support</span>
          </a>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-tertiary hover:bg-tertiary-container/35 transition-all"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
