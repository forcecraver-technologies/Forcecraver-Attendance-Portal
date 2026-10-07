import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('attendance_token') || null);
  const [loading, setLoading] = useState(true);

  // Check login on startup
  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err) {
          console.error('Session expired or invalid token:', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('attendance_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const register = async (formData) => {
    const res = await api.register(formData);
    localStorage.setItem('attendance_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const verifyOtpRegister = async (data) => {
    const res = await api.verifyOtpRegister(data);
    localStorage.setItem('attendance_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('attendance_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const res = await api.updateProfile(profileData);
    setUser(res.user);
    return res;
  };

  const changePassword = async (passwords) => {
    return await api.changePassword(passwords);
  };

  const isDeveloper = user?.role === 'developer';
  const isViewOnlyAdmin = user?.role === 'admin';
  const isAdminOrDev = isDeveloper || isViewOnlyAdmin;

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: isAdminOrDev,
    isDeveloper,
    isViewOnlyAdmin,
    login,
    register,
    verifyOtpRegister,
    logout,
    updateProfile,
    changePassword,
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
