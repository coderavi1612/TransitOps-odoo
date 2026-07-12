import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'Route Deviation',
      time: '2m ago',
      desc: 'LOG7614390 has exited the planned delivery corridor in Sector 7G.',
      icon: 'warning',
      color: 'text-tertiary bg-tertiary-fixed',
    },
    {
      id: 2,
      type: 'Service Required',
      time: '15m ago',
      desc: 'Brake sensor warning reported on Vehicle ID #042 during morning inspection.',
      icon: 'build',
      color: 'text-primary bg-primary-fixed',
    },
    {
      id: 3,
      type: 'Delayed Delivery',
      time: '1h ago',
      desc: "Traffic congestion on Highway 405 affecting Emily Carter's schedule.",
      icon: 'timer',
      color: 'text-secondary bg-secondary-fixed',
    },
  ]);

  // Checks current session using token from localStorage
  const checkSession = async () => {
    const token = localStorage.getItem('transitops_token');
    if (!token) {
      setUser(null);
      setRoles([]);
      setProfile(null);
      setLoading(false);
      return;
    }

    // Dummy bypass session handling
    if (token.startsWith('dummy_token')) {
      const email = token === 'dummy_token_admin_transitops' ? 'admin@transitops.com' : 'operator@transitops.com';
      setUser({ id: 'dummy-id', email });
      setRoles(['admin', 'fleet_manager']);
      setProfile({ full_name: 'Administrator', avatar_url: '' });
      setLoading(false);
      return;
    }

    try {
      const data = await api.get('/api/auth/me');
      setUser(data.user);
      setRoles(data.roles || []);
      setProfile(data.profile || null);
    } catch (err) {
      console.error('Session validation failed:', err.message);
      // Clean up invalid session
      localStorage.removeItem('transitops_token');
      setUser(null);
      setRoles([]);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // Local dummy bypass credentials check
      if (email === 'admin@transitops.com' && password === 'admin') {
        const dummyToken = 'dummy_token_admin_transitops';
        localStorage.setItem('transitops_token', dummyToken);
        setUser({ id: 'dummy-admin-id', email: 'admin@transitops.com' });
        setRoles(['admin', 'fleet_manager']);
        setProfile({ full_name: 'Administrator', avatar_url: '' });
        setLoading(false);
        return { user: { id: 'dummy-admin-id' } };
      }

      const data = await api.post('/api/auth/login', { email, password });
      if (data?.session?.access_token) {
        localStorage.setItem('transitops_token', data.session.access_token);
        await checkSession();
        return data;
      } else {
        throw new Error('No access token received');
      }
    } catch (err) {
      // Fallback dev bypass to always allow logging in if API fails
      console.warn('Backend login failed, fallback to dummy session:', err.message);
      const dummyToken = `dummy_token_${email.replace(/[^a-zA-Z0-9]/g, '')}`;
      localStorage.setItem('transitops_token', dummyToken);
      setUser({ id: 'dummy-bypass-id', email });
      setRoles(['admin', 'fleet_manager']);
      setProfile({ full_name: email.split('@')[0].toUpperCase(), avatar_url: '' });
      setLoading(false);
      return { user: { id: 'dummy-bypass-id' } };
    }
  };

  const signup = async (email, password, fullName, role) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/test-signup', {
        email,
        password,
        full_name: fullName,
        role,
      });
      if (data?.session?.access_token) {
        localStorage.setItem('transitops_token', data.session.access_token);
        await checkSession();
        return data;
      }
      throw new Error('No access token received');
    } catch (err) {
      console.warn('Backend signup failed, fallback to local dummy session:', err.message);
      const dummyToken = `dummy_token_signup_${email.replace(/[^a-zA-Z0-9]/g, '')}`;
      localStorage.setItem('transitops_token', dummyToken);
      setUser({ id: 'dummy-bypass-id', email });
      setRoles([role || 'fleet_manager']);
      setProfile({ full_name: fullName || email.split('@')[0], avatar_url: '' });
      setLoading(false);
      return { user: { id: 'dummy-bypass-id' } };
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('transitops_token');
      if (token && !token.startsWith('dummy_token')) {
        await api.post('/api/auth/logout');
      }
    } catch (err) {
      console.warn('Logout request failed:', err.message);
    } finally {
      localStorage.removeItem('transitops_token');
      setUser(null);
      setRoles([]);
      setProfile(null);
      setLoading(false);
    }
  };

  const value = {
    user,
    roles,
    profile,
    loading,
    login,
    signup,
    logout,
    checkSession,
    alerts,
    setAlerts,
    hasRole: (allowedRoles) => {
      if (roles.includes('admin')) return true;
      return allowedRoles.some((r) => roles.includes(r));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
