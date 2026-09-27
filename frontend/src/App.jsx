import React, { useState, lazy, Suspense } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { EmergencyProvider } from './context/EmergencyContext';
import { SafetyBanner } from './components/SafetyBanner';
import { Navbar } from './components/Navbar';
import { EmergencyModal } from './components/EmergencyModal';
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
      <SafetyBanner />
      <Navbar activeView={activeView} setActiveView={setActiveView} />

      <main className="main-content" role="main">
        <Suspense fallback={<ViewLoadingFallback />}>
          {renderRoleDashboard()}
        </Suspense>
      </main>

      {/* Global Emergency Modal & Toasts */}
      <EmergencyModal />
      <ToastContainer />

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-card)', padding: '1.25rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        MediLink CARE • FIT FEST 2026 Hackathon • Healthcare Administrative & Logistics Engine (Non-Diagnostic)
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
            <MainApp />
          </EmergencyProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
