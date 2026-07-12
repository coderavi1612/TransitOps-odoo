import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

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
      const data = await api.post('/api/auth/login', { email, password });
      if (data?.session?.access_token) {
        localStorage.setItem('transitops_token', data.session.access_token);
        await checkSession();
        return data;
      } else {
        throw new Error('No access token received');
      }
    } catch (err) {
      localStorage.removeItem('transitops_token');
      setUser(null);
      setRoles([]);
      setProfile(null);
      setLoading(false);
      throw err;
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
      localStorage.removeItem('transitops_token');
      setUser(null);
      setRoles([]);
      setProfile(null);
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('transitops_token');
      if (token) {
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
