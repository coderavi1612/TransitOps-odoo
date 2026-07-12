import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({ onMenuClick }) {
  const { profile, roles, alerts } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('transitops_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('transitops_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('transitops_theme', 'light');
    }
  }, [darkMode]);

  // Helper to map route paths to user-friendly titles
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Smart Dashboard';
      case '/vehicles':
        return 'Vehicles';
      case '/drivers':
        return 'Drivers';
      case '/trips':
        return 'Trips';
      case '/maintenance':
        return 'Maintenance';
      case '/fuel-expenses':
        return 'Fuel & Expenses';
      case '/reports':
        return 'Reports';
      case '/settings':
        return 'Settings';
      case '/documents':
        return 'Documents';
      default:
        return 'TransitOps';
    }
  };

  const getSubtext = () => {
    switch (location.pathname) {
      case '/':
        return 'Operations Overview';
      case '/vehicles':
        return 'Fleet Catalog';
      case '/drivers':
        return 'Fleet Oversight';
      case '/trips':
        return 'Allocation Console';
      case '/maintenance':
        return 'Service Schedules';
      case '/fuel-expenses':
        return 'Refuel Ledger';
      case '/reports':
        return 'Analytics Summary';
      case '/settings':
        return 'Access Controls';
      case '/documents':
        return 'Document Docket';
      default:
        return 'Enterprise Control';
    }
  };

  // Helper to format role name
  const formatRole = () => {
    if (roles.includes('admin')) return 'Administrator';
    if (roles.includes('fleet_manager')) return 'Manager';
    if (roles.includes('driver')) return 'Driver';
    if (roles.includes('safety_officer')) return 'Safety';
    if (roles.includes('financial_analyst')) return 'Analyst';
    return roles[0] || 'User';
  };

  return (
    <header className="h-20 bg-background border-b border-outline-variant/60 flex items-center justify-between px-4 md:px-8 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-xl transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <div>
          <h2 className="font-headline text-lg md:text-3xl font-bold text-on-surface leading-none">{getPageTitle()}</h2>
          <p className="font-label text-[10px] md:text-xs text-on-surface-variant tracking-wider uppercase mt-1 font-semibold">{getSubtext()}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-full transition-all cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span className="material-symbols-outlined text-xl">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-full transition-all relative cursor-pointer"
            >
              <span className="material-symbols-outlined">notifications</span>
              {alerts && alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 md:w-96 bg-surface-container-lowest border border-outline-variant/65 rounded-[24px] shadow-xl p-5 z-50 space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
                  <h4 className="font-headline text-sm font-bold text-on-surface">Recent Alerts</h4>
                  {alerts && alerts.length > 0 && (
                    <span className="px-2 py-0.5 bg-tertiary-fixed text-[8px] font-bold rounded-full uppercase tracking-wider text-on-tertiary-fixed">
                      {alerts.length} New
                    </span>
                  )}
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {alerts && alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div key={alert.id} className="flex gap-3 items-start hover:bg-surface-container-low p-2 rounded-xl transition-all">
                        <div className={`p-2 rounded-lg ${alert.color || 'bg-surface-container text-on-surface-variant'} shrink-0 flex items-center justify-center`}>
                          <span className="material-symbols-outlined text-base">{alert.icon || 'notifications'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-on-surface">{alert.type}</span>
                            <span className="text-[9px] text-on-surface-variant font-medium shrink-0">{alert.time}</span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant leading-relaxed">{alert.desc}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-on-surface-variant font-medium text-center py-4">No operational alerts logged.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => navigate('/trips')} title="Open trip schedule" className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-full transition-all hidden sm:block">
            <span className="material-symbols-outlined">calendar_today</span>
          </button>
        </div>

        <div className="h-8 w-px bg-outline-variant/50 hidden sm:block"></div>

        {/* User Card */}
        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer text-left focus:outline-none"
        >
          <div className="text-right hidden sm:block">
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
        </button>
      </div>
    </header>
  );
}
