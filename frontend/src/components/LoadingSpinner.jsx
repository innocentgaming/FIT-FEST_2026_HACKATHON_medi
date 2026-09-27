import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ text = 'Loading data...', size = 24 }) => {
  return (
    <div
      className="loading-spinner-container"
      role="status"
      aria-live="polite"
      style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        color: 'var(--text-muted)'
      }}
    >
      <Loader2
        size={size}
        style={{
          color: 'var(--primary-light)',
          animation: 'spin 1s linear infinite'
        }}
        aria-hidden="true"
      />
      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
        {text}
      </span>
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        Loading
      </span>
    </div>
  );
};
