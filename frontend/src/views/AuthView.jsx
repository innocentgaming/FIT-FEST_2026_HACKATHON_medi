import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Building2, Truck, UserCheck, Stethoscope, ArrowRight, Lock, Phone, Mail } from 'lucide-react';

export const AuthView = () => {
  const { login, register, demoAccounts } = useAuth();

  const [mode, setMode] = useState('LOGIN'); // LOGIN, REGISTER_PATIENT, REGISTER_HOSPITAL, REGISTER_AMBULANCE
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Patient Registration Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [patientBloodGroup, setPatientBloodGroup] = useState('B+');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register('PATIENT', {
        name: patientName,
        phone: patientPhone,
        email: patientEmail,
        password: patientPassword,
        bloodGroup: patientBloodGroup,
        emergencyContact,
        address
      });
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (acc) => {
    setError('');
    setLoading(true);
    try {
      await login(acc.identifier, acc.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '2rem auto', padding: '1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(90deg, #f8fafc 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MediLink – CARE
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '0.25rem' }}>
          Coordinated Assistance & Record Engine • FIT FEST 2026 Hackathon
        </p>
      </div>

      {/* 1-Click Demo Accounts Quick Access */}
      <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #111927 0%, #1e293b 100%)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ShieldCheck size={20} color="#38bdf8" />
          <h3 style={{ fontSize: '1.1rem', color: '#f8fafc' }}>
            Instant Demo Access (5 Official Roles)
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
          Click any role to test its specialized dashboard, real-time sync, and workflow permissions:
        </p>
        <div className="grid-3" style={{ gap: '0.75rem' }}>
          {demoAccounts.map((acc) => (
            <button
              key={acc.role}
              onClick={() => handleQuickDemoLogin(acc)}
              disabled={loading}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                textAlign: 'left'
              }}
            >
              <div>
                <span className={`role-pill role-${acc.role.toLowerCase()}`}>
                  {acc.role.replace('_', ' ')}
                </span>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', marginTop: '4px' }}>
                  {acc.label}
                </div>
              </div>
              <ArrowRight size={16} color="#94a3b8" />
            </button>
          ))}
        </div>
      </div>

      {/* Authentication Form Card */}
      <div className="card" style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div className="tabs-nav" style={{ justifyContent: 'center' }}>
          <button
            className={`tab-btn ${mode === 'LOGIN' ? 'active' : ''}`}
            onClick={() => { setMode('LOGIN'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`tab-btn ${mode === 'REGISTER_PATIENT' ? 'active' : ''}`}
            onClick={() => { setMode('REGISTER_PATIENT'); setError(''); }}
          >
            Register Patient
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Phone Number or Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 9876543210 or email@domain.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
            >
              {loading ? 'Authenticating...' : 'Sign In to MediLink'}
            </button>
          </form>
        )}

        {/* PATIENT REGISTRATION FORM */}
        {mode === 'REGISTER_PATIENT' && (
          <form onSubmit={handlePatientRegister}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter patient full name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="10-digit mobile"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select
                  className="form-select"
                  value={patientBloodGroup}
                  onChange={(e) => setPatientBloodGroup(e.target.value)}
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email (Optional)</label>
              <input
                type="email"
                className="form-control"
                placeholder="patient@example.com"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Emergency Contact Name & Phone</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Pooja Sharma (9876543211)"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Residential Address</label>
              <input
                type="text"
                className="form-control"
                placeholder="Area, City, Pincode"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Create Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Minimum 6 characters"
                value={patientPassword}
                onChange={(e) => setPatientPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
            >
              {loading ? 'Creating Profile...' : 'Complete Registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
