import React from 'react';
import { useSenior } from '../context/SeniorContext';
import { PhoneCall, AlertTriangle, Sparkles, Volume2, Mic, MicOff } from 'lucide-react';

export const SeniorFloatingWidget = () => {
  const { openSeniorModal, isSeniorModeActive, isSeniorModalOpen, isListening, startListening, stopListening, voiceTranscript } = useSenior();

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
      {/* Real-time Voice Command Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        className="senior-voice-mic-btn"
        aria-label="Speak voice command (Call ambulance, call daughter, check medicines)"
        style={{
          background: isListening ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          border: isListening ? '3px solid #f87171' : '3px solid #34d399',
          borderRadius: 'var(--radius-full)',
          padding: '0.65rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: isListening ? '0 0 25px rgba(239, 68, 68, 0.7)' : '0 8px 20px -3px rgba(16, 185, 129, 0.5)',
          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          animation: isListening ? 'pulseEmergency 1.2s infinite' : 'none'
        }}
        title="Speak Voice Command (e.g., 'Call Ambulance', 'Call Daughter', 'Check Medicines')"
      >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        <span>{isListening ? 'Listening... Speak Now' : '🎤 Voice Command'}</span>
      </button>

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
