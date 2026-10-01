import React, { useState, lazy, Suspense } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { EmergencyProvider } from './context/EmergencyContext';
import { SeniorProvider } from './context/SeniorContext';
import { AccessibilityToolbar } from './components/AccessibilityToolbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SafetyBanner } from './components/SafetyBanner';
import { Navbar } from './components/Navbar';
import { EmergencyModal } from './components/EmergencyModal';
import { SeniorAssistanceModal } from './components/SeniorAssistanceModal';
import { FamilyConfirmAlertModal } from './components/FamilyConfirmAlertModal';
import { SeniorFloatingWidget } from './components/SeniorFloatingWidget';
import { ToastContainer } from './components/ToastContainer';

const AuthView = lazy(() => import('./views/AuthView').then(m => ({ default: m.AuthView })));
const PatientDashboard = lazy(() => import('./views/PatientPortal/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const HospitalDashboard = lazy(() => import('./views/HospitalPortal/HospitalDashboard').then(m => ({ default: m.HospitalDashboard })));
const AmbulanceDashboard = lazy(() => import('./views/AmbulancePortal/AmbulanceDashboard').then(m => ({ default: m.AmbulanceDashboard })));
const AdminDashboard = lazy(() => import('./views/AdminPortal/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const DoctorDashboard = lazy(() => import('./views/DoctorPortal/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));

const ViewLoadingFallback = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ textAlign: 'center' }}>
      <div className="status-dot" style={{ width: '16px', height: '16px', background: '#38bdf8', margin: '0 auto 0.75rem', animation: 'pulseBeacon 1s infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading workspace...</p>
    </div>
  </div>
);

const MainApp = () => {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="status-dot" style={{ width: '20px', height: '20px', background: '#38bdf8', margin: '0 auto 1rem', animation: 'pulseBeacon 1s infinite' }} />
          <h3>Initializing MediLink CARE...</h3>
        </div>
      </div>
    );
  }

  const renderRoleDashboard = () => {
    if (!user) return <AuthView />;

    switch (user.role) {
      case 'PATIENT':
        return <PatientDashboard />;
      case 'HOSPITAL':
        return <HospitalDashboard />;
      case 'AMBULANCE':
        return <AmbulanceDashboard />;
      case 'ADMIN':
        return <AdminDashboard />;
      case 'SYSTEM_DOCTOR':
        return <DoctorDashboard />;
      default:
        return <PatientDashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Offline Resilient Indicator */}
      <OfflineIndicator />

      {/* Official Government & Accessibility Toolbar */}
      <AccessibilityToolbar />
      <SafetyBanner />
      <Navbar activeView={activeView} setActiveView={setActiveView} />

      <main className="main-content" role="main">
        <Suspense fallback={<ViewLoadingFallback />}>
          {renderRoleDashboard()}
        </Suspense>
      </main>

      {/* Global Modals & Widgets */}
      <EmergencyModal />
      <SeniorAssistanceModal />
      <FamilyConfirmAlertModal />
      <SeniorFloatingWidget />
      <ToastContainer />

      {/* Real-World Official Healthcare Network Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-card)',
          padding: '1.75rem 1.25rem',
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem'
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}
        >
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              MediLink CARE
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5 }}>
              National Healthcare Logistics, Hospital Capacity Synchronization & Rapid Emergency Dispatch Grid.
            </p>
          </div>

          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.4rem' }}>
              🚨 24x7 Emergency Helplines
            </div>
            <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div>🚑 <strong>108</strong> — National Emergency Ambulance</div>
              <div>👴 <strong>14567</strong> — Elder Line Senior Citizen Helpline</div>
              <div>🚨 <strong>112</strong> — All-in-One National Emergency Services</div>
              <div>🩺 <strong>1075</strong> — Tele-Doctor Consultation Helpline</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', marginBottom: '0.4rem' }}>
              🔒 Security & Privacy Standards
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5 }}>
              ISO 27001 Certified Infrastructure. Non-Diagnostic Administrative Profiling. Zero Clinical Liability Architecture.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          © 2026 MediLink CARE National Healthcare System. All rights reserved. • High-Accessibility Certified
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <EmergencyProvider>
            <SeniorProvider>
              <MainApp />
            </SeniorProvider>
          </EmergencyProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

