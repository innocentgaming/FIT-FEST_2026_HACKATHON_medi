import React, { useState, useEffect } from 'react';
import { Heart, Activity, Droplets, Wind, ShieldCheck } from 'lucide-react';

export const LiveVitalsWidget = () => {
  const [heartRate, setHeartRate] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [bp, setBp] = useState('118 / 78');

  // Subtle real-time vital variation simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setHeartRate((prev) => Math.min(84, Math.max(68, prev + Math.floor(Math.random() * 5 - 2))));
      setSpo2((prev) => (Math.random() > 0.85 ? (prev === 98 ? 99 : 98) : prev));
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="live-vitals-card"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.65) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1.5px solid rgba(56, 189, 248, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 25px rgba(56, 189, 248, 0.15)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulseBeacon 1s infinite'
            }}
          >
            <Heart size={18} fill="#ef4444" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Live Health Telemetry & Cardiac Rhythm
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Real-time Administrative Biosensor Stream (Non-Clinical Sync)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>
          <span className="status-dot" style={{ background: '#10b981', width: '8px', height: '8px' }} />
          <span>VITAL TELEMETRY STABLE</span>
        </div>
      </div>

      {/* Grid of 4 Vital Metrics + Animated ECG Waveform */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
        {/* Metric 1: Heart Rate */}
        <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Pulse / Heart Rate</span>
            <Activity size={15} color="#ef4444" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f87171' }}>{heartRate}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>BPM</span>
          </div>
        </div>

        {/* Metric 2: Blood Oxygen SpO2 */}
        <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Blood Oxygen (SpO2)</span>
            <Wind size={15} color="#38bdf8" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>{spo2}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>% (Optimal)</span>
          </div>
        </div>

        {/* Metric 3: Blood Pressure */}
        <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Blood Pressure</span>
            <Droplets size={15} color="#10b981" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#34d399' }}>{bp}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mmHg</span>
          </div>
        </div>

        {/* Metric 4: Animated SVG ECG Waveform */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', overflow: 'hidden', height: '70px', display: 'flex', alignItems: 'center' }}>
          <svg viewBox="0 0 300 60" style={{ width: '100%', height: '100%' }}>
            <path
              d="M 0 30 L 40 30 L 50 10 L 60 50 L 70 20 L 80 40 L 90 30 L 150 30 L 160 8 L 170 52 L 180 18 L 190 42 L 200 30 L 300 30"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 300,
                strokeDashoffset: 0,
                animation: 'dashEcg 2.5s linear infinite'
              }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
