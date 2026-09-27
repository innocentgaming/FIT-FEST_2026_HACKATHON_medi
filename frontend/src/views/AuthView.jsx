import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShieldCheck, User, Building2, Truck, UserCheck, Stethoscope, ArrowRight, Lock, Phone, Mail, MapPin, Activity, UserPlus, LogIn } from 'lucide-react';

export const AuthView = () => {
  const { login, register, demoAccounts } = useAuth();

  const [activeTab, setActiveTab] = useState('SIGN_IN'); // SIGN_IN, SIGN_UP
  const [signupRole, setSignupRole] = useState('PATIENT'); // PATIENT, HOSPITAL, AMBULANCE
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Patient Registration Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [patientBloodGroup, setPatientBloodGroup] = useState('B+');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [patientAddress, setPatientAddress] = useState('');

  // Hospital Registration Form State
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalEmail, setHospitalEmail] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [hospitalPassword, setHospitalPassword] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalArea, setHospitalArea] = useState('');

  // Ambulance Registration Form State
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [ambulanceType, setAmbulanceType] = useState('Advanced Life Support (ALS)');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (signupRole === 'PATIENT') {
        await register('PATIENT', {
          name: patientName,
          phone: patientPhone,
          email: patientEmail,
          password: patientPassword,
          bloodGroup: patientBloodGroup,
          emergencyContact,
          address: patientAddress
        });
      } else if (signupRole === 'HOSPITAL') {
        const res = await api.registerHospital({
          hospitalName,
          email: hospitalEmail,
          phone: hospitalPhone,
          password: hospitalPassword,
          address: hospitalAddress,
          area: hospitalArea || 'Pune'
        });
        if (res.token) {
          localStorage.setItem('medilink_token', res.token);
          window.location.reload();
        }
      } else if (signupRole === 'AMBULANCE') {
        const res = await api.registerAmbulance({
          driverName,
          phone: driverPhone,
          password: driverPassword,
          vehicleNo,
          ambulanceType
        });
        if (res.token) {
          localStorage.setItem('medilink_token', res.token);
          window.location.reload();
        }
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (acc) => {
    setError('');
    setSuccessMsg('');
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
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, background: 'linear-gradient(90deg, #f8fafc 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
          MediLink — CARE
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.25rem' }}>
          Coordinated Assistance & Record Engine • FIT-FEST 2026 Hackathon
        </p>
      </div>

      {/* 1-Click Role Logins for Testing Individual Patients & Doctors */}
      <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <ShieldCheck size={20} color="var(--primary-light)" />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Select Account to Login (Individual Patients, Doctors & Providers)
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Each patient and doctor has their own isolated data and separate dashboard. Click below to login as that specific user:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {demoAccounts.map((acc, idx) => (
            <button
              key={`${acc.role}-${idx}`}
              onClick={() => handleQuickDemoLogin(acc)}
              disabled={loading}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-subtle)'
              }}
            >
              <div>
                <span className={`role-pill role-${acc.role.toLowerCase()}`}>
                  {acc.role.replace('_', ' ')}
                </span>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {acc.label}
                </div>
                {acc.sub && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {acc.sub}
                  </div>
                )}
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </button>
          ))}
        </div>
      </div>

      {/* Authentication Container Card */}
      <div className="card" style={{ maxWidth: '560px', margin: '0 auto', boxShadow: 'var(--shadow-lg)' }}>
        {/* Sign In / Sign Up Top Switcher Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.35rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            className="btn"
            onClick={() => { setActiveTab('SIGN_IN'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: activeTab === 'SIGN_IN' ? 'var(--primary-gradient)' : 'transparent',
              color: activeTab === 'SIGN_IN' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              boxShadow: activeTab === 'SIGN_IN' ? '0 0 15px var(--primary-glow)' : 'none',
              transition: 'all var(--transition-fast)'
            }}
          >
            <LogIn size={18} />
            Sign In
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => { setActiveTab('SIGN_UP'); setError(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: activeTab === 'SIGN_UP' ? 'var(--primary-gradient)' : 'transparent',
              color: activeTab === 'SIGN_UP' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              boxShadow: activeTab === 'SIGN_UP' ? '0 0 15px var(--primary-glow)' : 'none',
              transition: 'all var(--transition-fast)'
            }}
          >
            <UserPlus size={18} />
            Sign Up (Register)
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-light)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-light)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            {successMsg}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 1: SIGN IN FORM */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'SIGN_IN' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Phone Number or Email</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 9876543210 or email@domain.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', fontSize: '1rem', fontWeight: 700 }}
            >
              {loading ? 'Authenticating...' : 'Sign In to MediLink'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => { setActiveTab('SIGN_UP'); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign Up here
              </button>
            </div>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: SIGN UP / REGISTER FORM */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'SIGN_UP' && (
          <div>
            {/* Role Sub-Selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>I want to register as a:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${signupRole === 'PATIENT' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSignupRole('PATIENT')}
                  style={{ padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  <User size={14} /> Patient
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${signupRole === 'HOSPITAL' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSignupRole('HOSPITAL')}
                  style={{ padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  <Building2 size={14} /> Hospital
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${signupRole === 'AMBULANCE' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSignupRole('AMBULANCE')}
                  style={{ padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  <Truck size={14} /> Ambulance
                </button>
              </div>
            </div>

            <form onSubmit={handleRegisterSubmit}>
              {/* PATIENT SIGN UP */}
              {signupRole === 'PATIENT' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Aarav Sharma"
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
                        placeholder="10-digit mobile number"
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
                    <label className="form-label">Email Address (Optional)</label>
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
                    <label className="form-label">Residential Address / City</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Kothrud, Pune"
                      value={patientAddress}
                      onChange={(e) => setPatientAddress(e.target.value)}
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
                </>
              )}

              {/* HOSPITAL SIGN UP */}
              {signupRole === 'HOSPITAL' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Hospital / Clinic Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Apollo Multi-Speciality Clinic"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Official Email</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="admin@hospital.org"
                        value={hospitalEmail}
                        onChange={(e) => setHospitalEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Helpline Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="Emergency contact"
                        value={hospitalPhone}
                        onChange={(e) => setHospitalPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Hospital Address & Area</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Shivaji Nagar, Pune"
                      value={hospitalAddress}
                      onChange={(e) => setHospitalAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Create Administrator Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Minimum 6 characters"
                      value={hospitalPassword}
                      onChange={(e) => setHospitalPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {/* AMBULANCE SIGN UP */}
              {signupRole === 'AMBULANCE' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Driver Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Santosh Shinde"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Mobile Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="10-digit mobile"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vehicle Registration No.</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. MH-12-CR-1011"
                        value={vehicleNo}
                        onChange={(e) => setVehicleNo(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ambulance Life Support Type</label>
                    <select
                      className="form-select"
                      value={ambulanceType}
                      onChange={(e) => setAmbulanceType(e.target.value)}
                    >
                      <option value="Advanced Life Support (ALS)">Advanced Life Support (ALS)</option>
                      <option value="Basic Life Support (BLS)">Basic Life Support (BLS)</option>
                      <option value="Patient Transport Unit (PTU)">Patient Transport Unit (PTU)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Create Driver Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Minimum 6 characters"
                      value={driverPassword}
                      onChange={(e) => setDriverPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', fontSize: '1rem', fontWeight: 700 }}
              >
                {loading ? 'Creating Account...' : `Sign Up as ${signupRole}`}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setActiveTab('SIGN_IN'); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Sign In here
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
