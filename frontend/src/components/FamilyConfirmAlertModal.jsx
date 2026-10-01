import React, { useState } from 'react';
import { useSenior } from '../context/SeniorContext';
import { useAuth } from '../context/AuthContext';
import {
  PhoneCall,
  MessageSquare,
  AlertTriangle,
  X,
  CheckCircle2,
  MapPin,
  User,
  Shield,
  Volume2,
  PhoneForwarded
} from 'lucide-react';

export const FamilyConfirmAlertModal = () => {
  const { pendingConfirmation, cancelFamilyContactAlert, confirmAndExecuteFamilyAlert, speak } = useSenior();
  const { user } = useAuth();

  const [selectedActionType, setSelectedActionType] = useState('CALL_AND_SMS'); // 'CALL_AND_SMS', 'CALL', 'SMS'

  if (!pendingConfirmation) return null;

  const { contact } = pendingConfirmation;
  const patientLocation = user?.address || 'Current Resident Location, Pune (GPS Synced)';

  const handleConfirm = () => {
    confirmAndExecuteFamilyAlert(user);
  };

  const handleReadAloud = () => {
    speak(
      `Confirm alert for ${contact.name}. Tap the green confirm button to place an immediate phone call and send an emergency SMS message with your location.`
    );
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 10050,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          width: '100%',
          background: 'var(--bg-main)',
          border: '3px solid #ef4444',
          borderRadius: 'var(--radius-xl)',
          padding: '1.75rem',
          boxShadow: '0 25px 60px -10px rgba(239, 68, 68, 0.5), 0 0 50px rgba(0, 0, 0, 0.9)',
          color: 'var(--text-primary)',
          position: 'relative'
        }}
      >
        {/* Header Alert Ribbon */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '0.6rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={22} color="#ef4444" />
            <span style={{ fontWeight: 900, color: '#f87171', fontSize: '0.95rem', letterSpacing: '0.04em' }}>
              STEP 2 OF 2: CONFIRM EMERGENCY ACTION
            </span>
          </div>

          <button
            onClick={handleReadAloud}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            title="Read Alert Prompt Aloud"
          >
            <Volume2 size={14} />
            <span>Read Aloud</span>
          </button>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 0.5rem', textAlign: 'center' }}>
          Alert & Call {contact.name}?
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 1.5rem' }}>
          Please tap <strong>CONFIRM</strong> below to initiate the direct call and dispatch an emergency SMS message.
        </p>

        {/* Contact Details Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              fontWeight: 900,
              flexShrink: 0
            }}
          >
            👤
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{contact.name}</h3>
              {contact.isPrimary && (
                <span style={{ fontSize: '0.68rem', background: '#0284c7', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                  PRIMARY
                </span>
              )}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
              {contact.relation}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.3rem' }}>
              📞 {contact.phone}
            </div>
          </div>
        </div>

        {/* Emergency SMS Preview Box */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px dashed rgba(56, 189, 248, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MessageSquare size={14} />
            <span>EMERGENCY SMS CONTENT THAT WILL BE SENT:</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.4 }}>
            "🚨 MEDILINK EMERGENCY ALERT: {user?.name || 'Patient'} has triggered an urgent alert and needs assistance! Current Location: {patientLocation}."
          </div>
        </div>

        {/* Action Buttons: 2nd Click Confirm vs Cancel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '0.85rem' }}>
          {/* CONFIRM (2nd Click) */}
          <button
            onClick={handleConfirm}
            className="btn btn-success"
            style={{
              padding: '1.1rem',
              fontSize: '1.1rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.55)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <PhoneCall size={22} />
            <span>CONFIRM & CALL NOW</span>
          </button>

          {/* CANCEL */}
          <button
            onClick={cancelFamilyContactAlert}
            className="btn btn-secondary"
            style={{
              padding: '1.1rem',
              fontSize: '1rem',
              fontWeight: 800,
              borderRadius: 'var(--radius-lg)'
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};
