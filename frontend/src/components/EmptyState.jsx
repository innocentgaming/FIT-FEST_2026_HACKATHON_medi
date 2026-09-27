import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items matching the selected criteria at this moment.',
  action = null
}) => {
  return (
    <div
      className="empty-state-card"
      role="region"
      aria-label={title}
      style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: 'rgba(18, 26, 45, 0.4)',
        border: '1px dashed var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '1rem 0'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(56, 189, 248, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary-light)',
          marginBottom: '1rem'
        }}
      >
        <Icon size={28} aria-hidden="true" />
      </div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.5, marginBottom: action ? '1.25rem' : 0 }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
