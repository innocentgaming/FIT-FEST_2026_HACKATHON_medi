import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export const ErrorMessage = ({
  message = 'An unexpected error occurred while loading data.',
  onRetry = null
}) => {
  return (
    <div
      className="error-message-card"
      role="alert"
      aria-live="assertive"
      style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        margin: '1rem 0'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontSize: '0.88rem', color: '#fca5a5', fontWeight: 500 }}>
          {message}
        </span>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            padding: '0.35rem 0.75rem',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            color: '#f8fafc'
          }}
          aria-label="Retry operation"
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
