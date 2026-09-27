import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';

export const SafetyBanner = () => {
  return (
    <div className="safety-banner" role="region" aria-label="Medical safety notice">
      <div style={{ display: 'flex', items: 'center', gap: '0.5rem', alignItems: 'center' }}>
        <ShieldAlert size={16} color="#818cf8" aria-hidden="true" />
        <span>
          <strong>Administrative & Coordination Engine:</strong> MediLink CARE manages beds, blood bank stock, ambulance logistics, and appointments.
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span className="safety-badge">NO MEDICAL DIAGNOSIS OR CLINICAL ADVICE</span>
      </div>
    </div>
  );
};
