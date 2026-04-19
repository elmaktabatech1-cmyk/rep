import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage, unwrap } from '../utils/api.js';
import { useStore } from '../store/useStore.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pushToast = useStore((state) => state.pushToast);

  const loadMe = useCallback(async () => {
    try {
      const data = unwrap(await api.get('/auth/me'));
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    try {
      const data = unwrap(await api.post('/auth/login', { email, password }));
      setUser(data.user);
      pushToast({ type: 'success', title: 'Welcome back', message: data.user.name });
      return data.user;
    } catch (error) {
      pushToast({ type: 'error', title: 'Login failed', message: getErrorMessage(error) });
      throw error;
    }
  }, [pushToast]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    refreshUser: loadMe,
    hasRole: (...roles) => roles.includes(user?.role),
  }), [user, loading, login, logout, loadMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
