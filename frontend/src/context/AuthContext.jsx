import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState([]);

  useEffect(() => {
    // Load initial user session
    const token = localStorage.getItem('medilink_token');
    if (token) {
      api.getMe()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          localStorage.removeItem('medilink_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Fetch demo accounts for quick testing
    api.getDemoAccounts()
      .then((res) => setDemoAccounts(res.accounts || []))
      .catch((err) => console.error('Error fetching demo accounts:', err));
  }, []);

  const login = async (identifier, password) => {
    const res = await api.login({ identifier, password });
    localStorage.setItem('medilink_token', res.token);
    setUser(res.user);
    return res;
  };

  const register = async (type, data) => {
    let res;
    if (type === 'PATIENT') {
      res = await api.registerPatient(data);
    } else if (type === 'AMBULANCE') {
      res = await api.registerAmbulance(data);
    } else if (type === 'HOSPITAL') {
      res = await api.registerHospital(data);
    }
    if (res?.token) {
      localStorage.setItem('medilink_token', res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('medilink_token');
    setUser(null);
  };

  // 1-Click Role Switcher for Hackathon Demonstrations & Pairing
  const quickSwitchRole = async (targetRole) => {
    const target = demoAccounts.find((a) => a.role === targetRole);
    if (target) {
      return login(target.identifier, target.password);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        quickSwitchRole,
        demoAccounts,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
