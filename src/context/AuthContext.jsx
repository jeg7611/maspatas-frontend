import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';
import { decodeJwt, getRoleFromPayload } from '../utils/jwt';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const payload = decodeJwt(token);
    if (payload && !user) {
      const authUser = {
        email: payload.email || payload.unique_name || payload.sub,
        username: payload.unique_name || payload.sub,
        role: getRoleFromPayload(payload),
      };
      setUser(authUser);
      localStorage.setItem('user', JSON.stringify(authUser));
    }
  }, [token, user]);

  const login = async ({ usernameOrEmail, password }) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post('/api/auth/login', {
        username: usernameOrEmail,
        email: usernameOrEmail,
        password,
      });

      const receivedToken = data.token || data.accessToken;
      if (!receivedToken) {
        throw new Error('Token missing in login response');
      }

      const payload = decodeJwt(receivedToken);
      const authUser = {
        email: data.email || payload?.email || usernameOrEmail,
        username: data.username || payload?.unique_name || usernameOrEmail,
        role: data.role || getRoleFromPayload(payload),
      };

      setToken(receivedToken);
      setUser(authUser);

      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(authUser));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.title ||
          'Invalid credentials. Please try again.',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = useMemo(
    () => ({
      login,
      logout,
      user,
      token,
      role: user?.role || '',
      isAuthenticated: Boolean(token),
      loading,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
