import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelExpenses from './pages/FuelExpenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Shared Layout Wrapper for Protected Routes
function MainLayout() {
  return (
    <div className="flex h-screen bg-background text-on-background overflow-hidden w-full font-body">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content display */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        
        {/* Children components pages */}
        <main className="flex-1 overflow-hidden flex flex-col bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public authentication route */}
          <Route path="/login" element={<Login />} />

          {/* Secure authenticated layout route tree */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/fuel-expenses" element={<FuelExpenses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
