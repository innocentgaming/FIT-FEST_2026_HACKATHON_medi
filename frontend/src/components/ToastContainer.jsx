import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Bell, AlertTriangle, CheckCircle, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useSocket();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => {
        const isEmergency =
          toast.type === 'EMERGENCY_DISPATCH' ||
          toast.type === 'ESCALATION_ALERT' ||
          (toast.title && toast.title.includes('🚨'));

        return (
          <div key={toast.id} className={`toast ${isEmergency ? 'toast-emergency' : ''}`}>
            <div style={{ marginTop: '2px' }}>
              {isEmergency ? (
                <AlertTriangle size={20} color="#ef4444" />
              ) : (
                <Bell size={20} color="#38bdf8" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isEmergency ? '#fca5a5' : '#f8fafc' }}>
                {toast.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '2px' }}>
                {toast.message}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                {new Date(toast.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
