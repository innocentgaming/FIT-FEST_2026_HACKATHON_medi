import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useEmergency } from '../context/EmergencyContext';
import { useSenior } from '../context/SeniorContext';
import { useTheme, THEMES } from '../context/ThemeContext';
import { Shield, AlertCircle, LogOut, User, Activity, Truck, Building2, UserCheck, Stethoscope, Sun, Moon, Sparkles, PhoneCall } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

export const Navbar = ({ activeView, setActiveView }) => {
  const { user, logout, quickSwitchRole, demoAccounts } = useAuth();
  const { openEmergencyMode } = useEmergency();
  const { openSeniorModal, isSeniorModeActive } = useSenior();
  const { theme, toggleTheme } = useTheme();

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

  const getThemeIcon = () => {
    if (theme === THEMES.LIGHT) return <Sun size={16} />;
    if (theme === THEMES.NIGHT) return <Sparkles size={16} />;
    return <Moon size={16} />;
  };

  const getThemeLabel = () => {
    if (theme === THEMES.LIGHT) return 'Light Mode';
    if (theme === THEMES.NIGHT) return 'Midnight Mode';
    return 'Dark Slate Mode';
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
        {/* Senior Care Mode Master Trigger */}
        <button
          className="btn"
          onClick={() => openSeniorModal('DIAL')}
          aria-label="Open Senior Citizen Care & Speed Dial"
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            border: '1.5px solid #38bdf8',
            borderRadius: 'var(--radius-full)',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            boxShadow: '0 0 15px rgba(56, 189, 248, 0.35)',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>👴</span>
          <span>SENIOR CARE & DIAL</span>
        </button>

        {/* Emergency Mode Master Trigger */}
        <button
          className="emergency-mode-btn"
          onClick={() => openEmergencyMode('AMBULANCE')}
          aria-label="Open Emergency Mode Command Center"
        >
          <AlertCircle size={18} />
          <span>EMERGENCY MODE</span>
        </button>

        {/* Theme Switcher Button (Dark / Night / Light) */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm theme-toggle-btn"
          title={`Switch Theme (Current: ${getThemeLabel()})`}
          aria-label={`Toggle Theme. Current: ${getThemeLabel()}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.6rem',
            borderRadius: 'var(--radius-md)'
          }}
        >
          {getThemeIcon()}
          <span style={{ fontSize: '0.72rem', textTransform: 'capitalize', fontWeight: 600 }}>{theme}</span>
        </button>

        {/* User Info & Logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <NotificationDropdown />

            <div className="demo-role-badge">
              <span className={`role-pill role-${user.role.toLowerCase()}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {getRoleIcon(user.role)}
                {user.role}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name.split(' ')[0]}</span>
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
