import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-headline text-lg font-medium text-on-surface-variant">Connecting to TransitOps...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
        <span className="material-symbols-outlined text-tertiary text-6xl mb-4">block</span>
        <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">Access Restricted</h2>
        <p className="text-on-surface-variant mb-6 text-sm">
          Your current security clearance level does not authorize access to this control module. Please contact your administrator if you require permissions.
        </p>
        <a href="/" className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container transition-all text-sm">
          Return to Dashboard
        </a>
      </div>
    );
  }

  return <Outlet />;
}
