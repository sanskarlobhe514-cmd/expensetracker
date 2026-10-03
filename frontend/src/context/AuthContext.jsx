import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('fintrack_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('fintrack_token'));
  const [loading, setLoading] = useState(true);

  // Validate token with backend on mount
  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await api.auth.me();
          if (res.user) {
            setUser(res.user);
            localStorage.setItem('fintrack_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('Session expired or invalid:', err.message);
          logout();
        }
      }
      setLoading(false);
    }

    checkAuth();

    const handleExpired = () => {
      logout();
    };
    window.addEventListener('auth-expired', handleExpired);
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.auth.login({ email, password });
    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('fintrack_token', res.token);
      localStorage.setItem('fintrack_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error('Authentication response missing token or user data');
  };

  const register = async (name, email, password) => {
    const res = await api.auth.register({ name, email, password });
    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('fintrack_token', res.token);
      localStorage.setItem('fintrack_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error('Registration failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fintrack_token');
    localStorage.removeItem('fintrack_user');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('fintrack_user', JSON.stringify(updatedUser));
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
