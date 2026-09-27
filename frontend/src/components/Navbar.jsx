import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useEmergency } from '../context/EmergencyContext';
import { Shield, AlertCircle, LogOut, User, Activity, Truck, Building2, UserCheck, Stethoscope } from 'lucide-react';

export const Navbar = ({ activeView, setActiveView }) => {
  const { user, logout, quickSwitchRole, demoAccounts } = useAuth();
  const { openEmergencyMode } = useEmergency();

  const getRoleIcon = (role) => {
    switch (role) {
      case 'PATIENT':
        return <User size={14} />;
      case 'HOSPITAL':
        return <Building2 size={14} />;
      case 'AMBULANCE':
        return <Truck size={14} />;
      case 'ADMIN':
        return <UserCheck size={14} />;
      case 'SYSTEM_DOCTOR':
        return <Stethoscope size={14} />;
      default:
        return <Activity size={14} />;
    }
  };

  return (
    <header className="navbar" role="banner">
      <div className="nav-brand" onClick={() => setActiveView('dashboard')}>
        <div className="nav-logo-icon">
          <Activity size={24} />
        </div>
        <div className="nav-brand-text">
          <h1>MediLink CARE</h1>
          <span>FIT FEST 2026 Hackathon Engine</span>
        </div>
      </div>

      <div className="nav-controls">
        {/* Emergency Mode Master Trigger */}
        <button
          className="emergency-mode-btn"
          onClick={() => openEmergencyMode('AMBULANCE')}
          aria-label="Open Emergency Mode Command Center"
        >
          <AlertCircle size={18} />
          <span>EMERGENCY MODE</span>
        </button>

        {/* 1-Click Role Switcher for Hackathon Testing */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Role Switcher:</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {demoAccounts.map((acc) => {
                const isActive = user.role === acc.role;
                return (
                  <button
                    key={acc.role}
                    onClick={() => quickSwitchRole(acc.role)}
                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.25rem 0.5rem',
                      border: isActive ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)'
                    }}
                    title={`Switch to ${acc.label}`}
                  >
                    {acc.role.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* User Info & Logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="demo-role-badge">
              <span className={`role-pill role-${user.role.toLowerCase()}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {getRoleIcon(user.role)}
                {user.role}
              </span>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>{user.name.split(' ')[0]}</span>
            </div>

            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
