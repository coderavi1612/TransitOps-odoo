import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { profile, roles } = useAuth();
  const location = useLocation();

  // Helper to map route paths to user-friendly titles
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Smart Delivery Dashboard';
      case '/vehicles':
        return 'Vehicle Registry';
      case '/drivers':
        return 'Driver Management';
      case '/trips':
        return 'Trip Dispatcher & Lifecycle';
      case '/maintenance':
        return 'Maintenance Log';
      case '/fuel-expenses':
        return 'Fuel & Expenses';
      case '/reports':
        return 'Reports & Analytics';
      case '/settings':
        return 'Settings & RBAC';
      default:
        return 'Sahara Fleet';
    }
  };

  const getSubtext = () => {
    switch (location.pathname) {
      case '/':
        return 'Live Operations Overview';
      case '/vehicles':
        return 'Total Fleet Catalog';
      case '/drivers':
        return 'Active Fleet Oversight';
      case '/trips':
        return 'Logistics Allocation Console';
      case '/maintenance':
        return 'Service Schedules & Audits';
      case '/fuel-expenses':
        return 'Refueling Logs & Financial Logs';
      case '/reports':
        return 'Strategic Analytics Summary';
      case '/settings':
        return 'Platform Access Control & Config';
      default:
        return 'Enterprise Control';
    }
  };

  // Helper to format role name
  const formatRole = () => {
    if (roles.includes('admin')) return 'Administrator';
    if (roles.includes('fleet_manager')) return 'Fleet Manager';
    if (roles.includes('driver')) return 'Driver';
    if (roles.includes('safety_officer')) return 'Safety Officer';
    if (roles.includes('financial_analyst')) return 'Financial Analyst';
    return roles[0] || 'User';
  };

  return (
    <header className="h-20 bg-background border-b border-outline-variant/60 flex items-center justify-between px-8 shrink-0">
      <div>
        <h2 className="font-headline text-3xl font-bold text-on-surface leading-none">{getPageTitle()}</h2>
        <p className="font-label text-xs text-on-surface-variant tracking-wider uppercase mt-1 font-semibold">{getSubtext()}</p>
      </div>

      <div className="flex items-center gap-6">
        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-full transition-all relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-full transition-all">
            <span className="material-symbols-outlined">calendar_today</span>
          </button>
        </div>

        <div className="h-8 w-px bg-outline-variant/50"></div>

        {/* User Card */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-on-surface leading-tight">{profile?.full_name || 'Fleet Operator'}</p>
            <p className="text-xs text-on-surface-variant font-medium">{formatRole()}</p>
          </div>
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover border border-outline-variant"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm">
              {(profile?.full_name || 'F').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
