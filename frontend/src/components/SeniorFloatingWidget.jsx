import React from 'react';
import { useSenior } from '../context/SeniorContext';
import { PhoneCall, AlertTriangle, Sparkles, Volume2 } from 'lucide-react';

export const SeniorFloatingWidget = () => {
  const { openSeniorModal, isSeniorModeActive, isSeniorModalOpen, toggleSeniorMode } = useSenior();

  if (isSeniorModalOpen) return null;

  return (
    <div
      className="senior-floating-container"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9990,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.6rem'
      }}
    >
      {/* Floating Senior Assist Button */}
      <button
        onClick={() => openSeniorModal('DIAL')}
        className="senior-floating-btn"
        aria-label="Open Senior Citizen Care, Dialpad & Helplines"
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
          color: '#ffffff',
          border: '3px solid #38bdf8',
          borderRadius: 'var(--radius-full)',
          padding: '0.85rem 1.4rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '1rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 10px 25px -3px rgba(2, 132, 199, 0.6), 0 0 20px rgba(56, 189, 248, 0.4)',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem'
          }}
        >
          👴
        </div>
        <span>Senior Dial & Help</span>
      </button>
    </div>
  );
};
