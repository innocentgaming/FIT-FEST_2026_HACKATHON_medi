import React, { useState, useEffect } from 'react';
import { WifiOff, PhoneCall, AlertTriangle, ShieldCheck } from 'lucide-react';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
        color: '#ffffff',
        padding: '0.75rem 1.25rem',
        borderBottom: '2px solid #ef4444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        zIndex: 99999,
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
      }}
      role="alert"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <WifiOff size={20} color="#fca5a5" />
        <div>
          <strong style={{ fontSize: '0.9rem' }}>Offline Mode Active: Internet Disconnected</strong>
          <div style={{ fontSize: '0.78rem', color: '#fecaca' }}>
            Emergency phone calls still work. You can call emergency lines directly below.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <a
          href="tel:108"
          className="btn btn-danger btn-sm"
          style={{ fontWeight: 800, padding: '0.35rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}
        >
          🚑 Call 108
        </a>
        <a
          href="tel:14567"
          className="btn btn-secondary btn-sm"
          style={{ fontWeight: 800, padding: '0.35rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none', background: '#0284c7', color: '#fff', border: 'none' }}
        >
          👴 Call Elder 14567
        </a>
      </div>
    </div>
  );
};
