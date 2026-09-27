import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { EmergencyProvider } from './context/EmergencyContext';
import { SafetyBanner } from './components/SafetyBanner';
import { Navbar } from './components/Navbar';
import { EmergencyModal } from './components/EmergencyModal';
import { ToastContainer } from './components/ToastContainer';

import { AuthView } from './views/AuthView';
import { PatientDashboard } from './views/PatientPortal/PatientDashboard';
import { HospitalDashboard } from './views/HospitalPortal/HospitalDashboard';
import { AmbulanceDashboard } from './views/AmbulancePortal/AmbulanceDashboard';
import { AdminDashboard } from './views/AdminPortal/AdminDashboard';
import { DoctorDashboard } from './views/DoctorPortal/DoctorDashboard';

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
        {renderRoleDashboard()}
      </main>

      {/* Global Emergency Modal & Toasts */}
      <EmergencyModal />
      <ToastContainer />

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-card)', padding: '1.25rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
        MediLink CARE • FIT FEST 2026 Hackathon • Healthcare Administrative & Logistics Engine (Non-Diagnostic)
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <EmergencyProvider>
          <MainApp />
        </EmergencyProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
