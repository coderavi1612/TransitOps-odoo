import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { logout, roles } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/vehicles', label: 'Vehicle Registry', icon: 'local_shipping' },
    { to: '/drivers', label: 'Driver Management', icon: 'person_pin', roles: ['admin', 'fleet_manager', 'driver', 'safety_officer', 'dispatcher'] },
    { to: '/trips', label: 'Trip Dispatcher', icon: 'route' },
    { to: '/maintenance', label: 'Maintenance', icon: 'build' },
    { to: '/fuel-expenses', label: 'Fuel & Expenses', icon: 'local_gas_station', roles: ['admin', 'fleet_manager', 'driver', 'financial_analyst', 'dispatcher'] },
    { to: '/reports', label: 'Reports', icon: 'assessment', roles: ['admin', 'fleet_manager', 'safety_officer', 'financial_analyst', 'dispatcher'] },
    { to: '/documents', label: 'Document Docket', icon: 'folder_open' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ];
  const visibleLinks = links.filter((link) => !link.roles || roles.includes('admin') || link.roles.some((role) => roles.includes(role)));

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden cursor-pointer"
        />
      )}

      <aside
        className={`w-64 bg-surface-container border-r border-outline-variant/60 flex flex-col h-full fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Section */}
        <div className="p-6 border-b border-outline-variant/40 flex justify-between items-center">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight leading-none">TransitOps</h1>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mt-1.5 font-bold">Enterprise Control</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-on-surface-variant hover:bg-surface-container-high rounded-full cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
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
    </>
  );
}
