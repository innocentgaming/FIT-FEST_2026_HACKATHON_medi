import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEmergency } from '../context/EmergencyContext';
import { useTheme, THEMES } from '../context/ThemeContext';
import { Shield, AlertCircle, LogOut, User, Activity, Truck, Building2, UserCheck, Stethoscope, Sun, Moon, Sparkles, ZoomIn, ZoomOut, Type } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

export const Navbar = ({ activeView, setActiveView }) => {
  const { user, logout, quickSwitchRole } = useAuth();
  const { openEmergencyMode } = useEmergency();
  const { theme, toggleTheme } = useTheme();
  const [fontSizeLevel, setFontSizeLevel] = useState(100);

  const handleAdjustFontSize = (delta) => {
    const nextLevel = Math.max(90, Math.min(130, fontSizeLevel + delta));
    setFontSizeLevel(nextLevel);
    document.documentElement.style.fontSize = `${nextLevel}%`;
  };

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
          <span>National Healthcare Coordination Network</span>
        </div>
      </div>

      <div className="nav-controls">
        {/* Accessibility Font Size Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 6px'
          }}
          title="Adjust Text Size for Accessibility"
          aria-label="Font Size Adjuster"
        >
          <button
            onClick={() => handleAdjustFontSize(-10)}
            className="btn-counter"
            style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}
            aria-label="Decrease Font Size"
            title="Smaller Text (A-)"
          >
            A-
          </button>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0 4px', color: 'var(--text-secondary)' }}>
            {fontSizeLevel}%
          </span>
          <button
            onClick={() => handleAdjustFontSize(10)}
            className="btn-counter"
            style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}
            aria-label="Increase Font Size"
            title="Larger Text for Seniors / Visually Impaired (A+)"
          >
            A+
          </button>
        </div>

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

            <div className="demo-role-badge" style={{ border: '1px solid var(--border-card)' }}>
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
