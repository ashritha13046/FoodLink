import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('fl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fl_token');
    const userData = localStorage.getItem('fl_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);

    // FIX: localStorage is shared by all tabs. If another tab logs in/out as a
    // different user, keep this tab in sync so it never sends one role's token
    // while showing another role's pages.
    const onStorage = (e) => {
      if (e.key !== 'fl_token' && e.key !== 'fl_user' && e.key !== null) return;
      const t = localStorage.getItem('fl_token');
      const u = localStorage.getItem('fl_user');
      setUser(t && u ? JSON.parse(u) : null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('fl_token', token);
    localStorage.setItem('fl_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('fl_token');
    localStorage.removeItem('fl_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { API };
