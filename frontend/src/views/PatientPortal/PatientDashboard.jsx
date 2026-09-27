import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEmergency } from '../../context/EmergencyContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { LiveMap } from '../../components/LiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { ErrorMessage } from '../../components/ErrorMessage';
import {
  Calendar,
  Clock,
  Building2,
  Droplet,
  Truck,
  AlertCircle,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Phone,
  User,
  Activity,
  Layers,
  MapPin,
  Shield,
  FileText,
  ExternalLink,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

export const PatientDashboard = () => {
  const { user } = useAuth();
  const { openEmergencyMode } = useEmergency();
  const { liveResourceUpdate, liveBloodBankUpdate, liveRequestUpdate, liveLocationUpdate } = useSocket();

  // Navigation Tabs: DASHBOARD, APPOINTMENTS, HOSPITALS, BLOOD, REQUESTS, PROFILE
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [appointments, setAppointments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [appointmentPurpose, setAppointmentPurpose] = useState('Routine Health OPD Checkup');
  const [specialistName, setSpecialistName] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Hospital Search State
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [bedTypeFilter, setBedTypeFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [specialistFilter, setSpecialistFilter] = useState('');

  // Blood Search State
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'B+');
  const [bloodUnits, setBloodUnits] = useState(2);
  const [bloodLocation, setBloodLocation] = useState('Pune');
  const [bloodUrgency, setBloodUrgency] = useState('URGENT');
  const [bloodMatches, setBloodMatches] = useState([]);
  const [bloodSearchLoading, setBloodSearchLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Sync real-time updates
  useEffect(() => {
    if (liveResourceUpdate) {
      setHospitals((prev) =>
        prev.map((h) => (h.id === liveResourceUpdate.hospitalId ? { ...h, resources: liveResourceUpdate.resources } : h))
      );
    }
  }, [liveResourceUpdate]);

  useEffect(() => {
    if (liveBloodBankUpdate) {
      setHospitals((prev) =>
        prev.map((h) => (h.id === liveBloodBankUpdate.hospitalId ? { ...h, bloodBank: liveBloodBankUpdate.bloodBank } : h))
      );
    }
  }, [liveBloodBankUpdate]);

  useEffect(() => {
    if (liveRequestUpdate) {
      loadData();
    }
  }, [liveRequestUpdate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [apts, hosps, ambs, reqs] = await Promise.all([
        api.getAppointments(),
        api.getHospitals(),
        api.getAmbulances(),
        api.getRequests()
      ]);
      setAppointments(apts.appointments || []);
      setHospitals(hosps.hospitals || []);
      setAmbulances(ambs.ambulances || []);
      setMyRequests(reqs.requests || []);
      if (hosps.hospitals?.length > 0 && !selectedHospitalId) {
        setSelectedHospitalId(hosps.hospitals[0].id);
      }
    } catch (err) {
      console.error('Error loading patient dashboard data:', err);
      setErrorMessage('Failed to load patient coordination records. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    try {
      await api.bookAppointment({
        hospitalId: selectedHospitalId,
        date: selectedDate,
        time: selectedTime,
        purpose: appointmentPurpose,
        specialistName: specialistName || 'General OPD Desk',
        notes: 'Patient scheduled via MediLink Portal.'
      });
      setShowBookingModal(false);
      loadData();
    } catch (err) {
      alert('Error booking appointment: ' + err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelAppointment = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await api.updateAppointmentStatus(id, 'CANCELLED', 'Cancelled by patient');
        loadData();
      } catch (err) {
        alert('Error cancelling: ' + err.message);
      }
    }
  };

  const handleRunBloodSearch = async (e) => {
    if (e) e.preventDefault();
    setBloodSearchLoading(true);
    try {
      const res = await api.searchBlood({
        bloodGroup,
        unitsRequired: bloodUnits,
        location: bloodLocation,
        urgency: bloodUrgency
      });
      setBloodMatches(res.matches || []);
    } catch (err) {
      console.error('Blood search error:', err);
    } finally {
      setBloodSearchLoading(false);
    }
  };

  const filteredHospitals = hospitals.filter((h) => {
    const q = hospitalQuery.toLowerCase();
    const matchesQ =
      !q ||
      h.name.toLowerCase().includes(q) ||
      (h.area && h.area.toLowerCase().includes(q)) ||
      (h.address && h.address.toLowerCase().includes(q)) ||
      (h.city && h.city.toLowerCase().includes(q)) ||
      (h.specialists || []).some(
        (s) => s.specialty?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q)
      ) ||
      (h.equipment || []).some((eq) => eq.toLowerCase().includes(q));

    if (!matchesQ) return false;

    if (bedTypeFilter === 'ICU') return (h.resources?.icuBedsAvailable || 0) > 0;
    if (bedTypeFilter === 'VENTILATOR') return (h.resources?.ventilatorsAvailable || 0) > 0;
    if (bedTypeFilter === 'OXYGEN') return (h.resources?.oxygenCylindersAvailable || 0) > 0;
    if (bedTypeFilter === 'GENERAL') return (h.resources?.generalBedsAvailable || 0) > 0;

    if (bloodGroupFilter && (h.bloodBank?.[bloodGroupFilter] || 0) <= 0) {
      return false;
    }

    if (specialistFilter) {
      const specQ = specialistFilter.toLowerCase();
      const hasSpec = (h.specialists || []).some(
        (s) => s.specialty?.toLowerCase().includes(specQ) || s.name?.toLowerCase().includes(specQ)
      );
      if (!hasSpec) return false;
    }

    return true;
  });

  const activeAmbulanceRequests = myRequests.filter((r) => r.type === 'AMBULANCE' || r.type === 'AMBULANCE_REQUEST');

  return (
    <div className="patient-portal-view">
      {/* Patient Welcome & Hero 10-Second Communicator */}
      <section
        className="card"
        style={{
          background: 'linear-gradient(135deg, #111927 0%, #1e293b 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
        aria-label="Patient Overview Header"
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="role-pill role-patient">PATIENT PORTAL</span>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>ID: {user?.id}</span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#f8fafc' }}>
            Welcome, {user?.name}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
            Blood Group: <strong style={{ color: '#ef4444' }}>{user?.bloodGroup || 'B+'}</strong> • Region: Pune Medical Command Grid
          </p>
        </div>

        <button
          onClick={() => openEmergencyMode('AMBULANCE')}
          className="emergency-mode-btn"
          style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
          aria-label="Activate Emergency Mode Command Center"
        >
          <AlertCircle size={20} aria-hidden="true" />
          <span>🚨 ACTIVATE EMERGENCY MODE</span>
        </button>
      </section>

      {/* Navigation Tabs (Patient: Dashboard, Appointments, Find Facilities, Find Blood, Emergency, Requests, Profile) */}
      <nav className="tabs-nav" aria-label="Patient Portal Navigation">
        <button
          className={`tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
          onClick={() => setActiveTab('DASHBOARD')}
        >
          <Activity size={16} aria-hidden="true" /> Dashboard
        </button>

        <button
          className={`tab-btn ${activeTab === 'APPOINTMENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('APPOINTMENTS')}
        >
          <Calendar size={16} aria-hidden="true" /> Appointments ({appointments.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'HOSPITALS' ? 'active' : ''}`}
          onClick={() => setActiveTab('HOSPITALS')}
        >
          <Building2 size={16} aria-hidden="true" /> Find Facilities ({hospitals.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'BLOOD' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('BLOOD');
            if (bloodMatches.length === 0) handleRunBloodSearch();
          }}
        >
          <Droplet size={16} aria-hidden="true" /> Find Blood
        </button>

        <button
          className="tab-btn"
          style={{ color: '#f87171', fontWeight: 700 }}
          onClick={() => openEmergencyMode('AMBULANCE')}
        >
          <AlertCircle size={16} aria-hidden="true" /> Emergency
        </button>

        <button
          className={`tab-btn ${activeTab === 'REQUESTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('REQUESTS')}
        >
          <FileText size={16} aria-hidden="true" /> Requests ({myRequests.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'PROFILE' ? 'active' : ''}`}
          onClick={() => setActiveTab('PROFILE')}
        >
          <User size={16} aria-hidden="true" /> Profile
        </button>
      </nav>

      {errorMessage && <ErrorMessage message={errorMessage} onRetry={loadData} />}

      {loading ? (
        <LoadingSpinner text="Synchronizing patient health coordination telemetry..." />
      ) : (
        <>
          {/* TAB 1: DASHBOARD (10-Second 5 Pillar Overview) */}
          {activeTab === 'DASHBOARD' && (
            <div className="tab-pane">
              {/* 5-Pillar Feature Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}
              >
                {/* Pillar 1: Appointments */}
                <div
                  className="card"
                  style={{
                    background: 'rgba(18, 26, 45, 0.7)',
                    border: '1px solid var(--border-card)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveTab('APPOINTMENTS')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(56, 189, 248, 0.12)', borderRadius: '8px', color: '#38bdf8' }}>
                      <Calendar size={20} />
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                      {appointments.length}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>
                    Appointments
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    OPD desk bookings & follow-ups
                  </p>
                </div>

                {/* Pillar 2: Emergency */}
                <div
                  className="card"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    cursor: 'pointer'
                  }}
                  onClick={() => openEmergencyMode('AMBULANCE')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444' }}>
                      <AlertCircle size={20} />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>
                      24x7 Live
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171', marginBottom: '0.2rem' }}>
                    Emergency Mode
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#fca5a5' }}>
                    Ambulance, blood & critical dispatch
                  </p>
                </div>

                {/* Pillar 3: Ambulances */}
                <div
                  className="card"
                  style={{
                    background: 'rgba(18, 26, 45, 0.7)',
                    border: '1px solid var(--border-card)',
                    cursor: 'pointer'
                  }}
                  onClick={() => openEmergencyMode('AMBULANCE')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '8px', color: '#10b981' }}>
                      <Truck size={20} />
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                      {ambulances.filter((a) => (a.status || '').toUpperCase() === 'AVAILABLE').length} Available
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>
                    Ambulances
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    GPS tracked emergency transit fleet
                  </p>
                </div>

                {/* Pillar 4: Blood Bank */}
                <div
                  className="card"
                  style={{
                    background: 'rgba(18, 26, 45, 0.7)',
                    border: '1px solid var(--border-card)',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setActiveTab('BLOOD');
                    if (bloodMatches.length === 0) handleRunBloodSearch();
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '8px', color: '#ef4444' }}>
                      <Droplet size={20} />
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>
                      8 Groups
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>
                    Blood Bank
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Smart cold storage inventory search
                  </p>
                </div>

                {/* Pillar 5: Facilities */}
                <div
                  className="card"
                  style={{
                    background: 'rgba(18, 26, 45, 0.7)',
                    border: '1px solid var(--border-card)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveTab('HOSPITALS')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.12)', borderRadius: '8px', color: '#818cf8' }}>
                      <Building2 size={20} />
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                      {hospitals.length}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>
                    Healthcare Facilities
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Live ICU, bed & oxygen inventory
                  </p>
                </div>
              </div>

              {/* Active Emergency Tracker Strip if any */}
              {activeAmbulanceRequests.length > 0 && (
                <div
                  className="card"
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', background: '#ef4444', color: '#fff', borderRadius: '8px' }}>
                      <Truck size={22} />
                    </div>
                    <div>
                      <h4 style={{ color: '#f87171', fontSize: '0.95rem', fontWeight: 700 }}>
                        Active Emergency Dispatch: #{activeAmbulanceRequests[0].id}
                      </h4>
                      <p style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                        Vehicle: {activeAmbulanceRequests[0].assignedAmbulanceVehicle || 'Assigned Nearest Unit'} • Priority: {activeAmbulanceRequests[0].priority}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <StatusBadge status={activeAmbulanceRequests[0].status} tripStatus={activeAmbulanceRequests[0].ambulanceTripStatus} />
                    <button
                      onClick={() => openEmergencyMode('STATUS')}
                      className="btn btn-sm btn-primary"
                    >
                      Track Live Progress
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Activity: Appointments & Requests */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      Upcoming Appointments
                    </h3>
                    <button
                      onClick={() => setShowBookingModal(true)}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      <Plus size={14} /> Book OPD
                    </button>
                  </div>

                  {appointments.length === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title="No Appointments Booked"
                      description="Schedule an OPD visit at any network healthcare facility."
                      action={
                        <button onClick={() => setShowBookingModal(true)} className="btn btn-primary btn-sm">
                          Book Appointment
                        </button>
                      }
                    />
                  ) : (
                    appointments.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                            {apt.hospitalName || 'Network Facility'}
                          </h4>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            📅 {apt.appointmentDate || apt.date} • ⏰ {apt.appointmentTime || apt.time}
                          </span>
                        </div>
                        <StatusBadge status={apt.status} />
                      </div>
                    ))
                  )}
                </div>

                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      Coordination Requests
                    </h3>
                    <button
                      onClick={() => setActiveTab('REQUESTS')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      View All
                    </button>
                  </div>

                  {myRequests.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="No Coordination Requests"
                      description="Your admission, blood, and emergency requests will appear here."
                    />
                  ) : (
                    myRequests.slice(0, 3).map((req) => (
                      <div
                        key={req.id}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>
                              {req.type}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>#{req.id}</span>
                          </div>
                          <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                            {req.targetHospitalName || 'Network Facility'}
                          </span>
                        </div>
                        <StatusBadge status={req.status} tripStatus={req.ambulanceTripStatus} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPOINTMENTS */}
          {activeTab === 'APPOINTMENTS' && (
            <div className="tab-pane">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                    Administrative OPD Appointments
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    Schedule and manage out-patient visits with network hospitals.
                  </p>
                </div>
                <button onClick={() => setShowBookingModal(true)} className="btn btn-primary">
                  <Plus size={16} /> Book Appointment
                </button>
              </div>

              {appointments.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No Appointments Found"
                  description="You have not scheduled any appointments yet."
                  action={
                    <button onClick={() => setShowBookingModal(true)} className="btn btn-primary btn-sm">
                      Book First Appointment
                    </button>
                  }
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1rem' }}>
                  {appointments.map((apt) => (
                    <div key={apt.id} className="card" style={{ border: '1px solid var(--border-card)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>#{apt.id}</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                            {apt.hospitalName || 'Healthcare Facility'}
                          </h4>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{apt.department || 'General Medicine'}</span>
                        </div>
                        <StatusBadge status={apt.status} />
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
                        <div>📅 Date: <strong>{apt.appointmentDate || apt.date}</strong></div>
                        <div>⏰ Time: <strong>{apt.appointmentTime || apt.time}</strong></div>
                        <div>👨‍⚕️ Desk: {apt.specialistName || 'Duty OPD Officer'}</div>
                        <div>📝 Purpose: {apt.purpose}</div>
                      </div>

                      {apt.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleCancelAppointment(apt.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                        >
                          Cancel Appointment
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FIND FACILITIES (HOSPITALS) */}
          {activeTab === 'HOSPITALS' && (
            <div className="tab-pane">
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                  Healthcare Facility Directory & Live Bed Telemetry
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Real-time bed, ICU, ventilator, and oxygen availability across network hospitals.
                </p>
              </div>

              {/* Filters */}
              <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Search Facility / Area</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Apollo, Ruby Hall, Deccan"
                      value={hospitalQuery}
                      onChange={(e) => setHospitalQuery(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Bed Availability</label>
                    <select
                      className="form-control"
                      value={bedTypeFilter}
                      onChange={(e) => setBedTypeFilter(e.target.value)}
                    >
                      <option value="">All Bed Capacities</option>
                      <option value="GENERAL">General Beds Available</option>
                      <option value="ICU">ICU Beds Available</option>
                      <option value="VENTILATOR">Ventilators Available</option>
                      <option value="OXYGEN">Oxygen Available</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Blood Group</label>
                    <select
                      className="form-control"
                      value={bloodGroupFilter}
                      onChange={(e) => setBloodGroupFilter(e.target.value)}
                    >
                      <option value="">Any Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {filteredHospitals.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No Matching Facilities"
                  description="No healthcare facilities match your current search and filter criteria."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  {filteredHospitals.map((h) => (
                    <div key={h.id} className="card" style={{ border: '1px solid var(--border-card)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>{h.name}</h4>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>📍 {h.area || h.address || 'Pune'}</span>
                        </div>
                        <span className="badge badge-primary">{h.type || 'Hospital'}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', margin: '0.75rem 0' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>General Beds</span>
                          <strong style={{ fontSize: '1rem', color: '#38bdf8' }}>
                            {h.resources?.generalBedsAvailable || 0} / {h.resources?.generalBedsTotal || 0}
                          </strong>
                        </div>
                        <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>ICU Beds</span>
                          <strong style={{ fontSize: '1rem', color: '#ef4444' }}>
                            {h.resources?.icuBedsAvailable || 0} / {h.resources?.icuBedsTotal || 0}
                          </strong>
                        </div>
                        <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Ventilators</span>
                          <strong style={{ fontSize: '1rem', color: '#10b981' }}>
                            {h.resources?.ventilatorsAvailable || 0} / {h.resources?.ventilatorsTotal || 0}
                          </strong>
                        </div>
                        <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Oxygen Units</span>
                          <strong style={{ fontSize: '1rem', color: '#f59e0b' }}>
                            {h.resources?.oxygenCylindersAvailable || 0} Cylinders
                          </strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button
                          onClick={() => {
                            setSelectedHospitalId(h.id);
                            setShowBookingModal(true);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                        >
                          Book Visit
                        </button>
                        {h.mapUrl && (
                          <a
                            href={h.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Open Google Maps Location"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FIND BLOOD */}
          {activeTab === 'BLOOD' && (
            <div className="tab-pane">
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                  Smart Blood Requirement Matcher
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Real-time stock locator across verified hospital cold storage banks.
                </p>
              </div>

              {/* Search Form */}
              <form onSubmit={handleRunBloodSearch} className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Blood Group</label>
                    <select
                      className="form-control"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Units Required</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      className="form-control"
                      value={bloodUnits}
                      onChange={(e) => setBloodUnits(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Location</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Pune, Kothrud"
                      value={bloodLocation}
                      onChange={(e) => setBloodLocation(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Urgency Level</label>
                    <select
                      className="form-control"
                      value={bloodUrgency}
                      onChange={(e) => setBloodUrgency(e.target.value)}
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="URGENT">Urgent</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-danger" disabled={bloodSearchLoading}>
                    <Search size={16} /> {bloodSearchLoading ? 'Searching...' : 'Find Matches'}
                  </button>
                </div>
              </form>

              {/* Matches List */}
              {bloodMatches.length === 0 ? (
                <EmptyState
                  icon={Droplet}
                  title="No Blood Matches Found"
                  description="Run a blood requirement search above to query verified cold storage inventory."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  {bloodMatches.map((m) => (
                    <div key={m.hospitalId} className="card" style={{ border: m.isSufficient ? '1px solid #10b981' : '1px solid var(--border-card)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>{m.hospitalName}</h4>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>📍 {m.area || m.address || 'Pune'}</span>
                        </div>
                        <span className={`badge ${m.isSufficient ? 'badge-success' : 'badge-warning'}`}>
                          {m.isSufficient ? 'Sufficient Stock' : 'Partial Stock'}
                        </span>
                      </div>

                      <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.75rem', borderRadius: '6px', margin: '0.75rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Group {m.bloodGroup} Available:</span>
                          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444' }}>{m.availableUnits} Units</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Relevance:</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', display: 'block' }}>{m.locationScore}%</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <a
                          href={`tel:${m.emergencyHelpline || m.phone || '108'}`}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          <Phone size={14} /> Helpline
                        </a>
                        <button
                          onClick={() => openEmergencyMode('BLOOD')}
                          className="btn btn-danger btn-sm"
                          style={{ flex: 1 }}
                        >
                          Request Units
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REQUESTS (Patient Requests History) */}
          {activeTab === 'REQUESTS' && (
            <div className="tab-pane">
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                  Patient Coordination Requests
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  History and live status of admission, transfer, blood, and ambulance requests.
                </p>
              </div>

              {myRequests.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No Coordination Requests"
                  description="You have not submitted any healthcare coordination requests yet."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  {myRequests.map((r) => (
                    <div key={r.id} className="card" style={{ border: '1px solid var(--border-card)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>#{r.id}</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>{r.type}</h4>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{r.targetHospitalName || 'Network Facility'}</span>
                        </div>
                        <StatusBadge status={r.status} tripStatus={r.ambulanceTripStatus} />
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px', margin: '0.75rem 0' }}>
                        <div>Priority: <strong>{r.priority}</strong></div>
                        {r.assignedAmbulanceVehicle && <div>Ambulance: <strong>{r.assignedAmbulanceVehicle}</strong></div>}
                        {r.responseNotes && <div>Facility Notes: <em>"{r.responseNotes}"</em></div>}
                        {r.resolutionNotes && <div style={{ color: '#34d399' }}>Doctor Override: <em>"{r.resolutionNotes}"</em></div>}
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                          Submitted: {new Date(r.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {r.type === 'AMBULANCE' && (
                        <button
                          onClick={() => openEmergencyMode('STATUS')}
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%' }}
                        >
                          View Live GPS Track
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PROFILE */}
          {activeTab === 'PROFILE' && (
            <div className="tab-pane">
              <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-card)', paddingBottom: '1rem' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                    <User size={30} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>{user?.name}</h3>
                    <span className="role-pill role-patient">PATIENT</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '0.5rem' }}>ID: {user?.id}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.88rem', color: '#cbd5e1' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Primary Phone</span>
                    <strong>{user?.phone || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Registered Email</span>
                    <strong>{user?.email || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Verified Blood Group</span>
                    <strong style={{ color: '#ef4444' }}>{user?.bloodGroup || 'B+'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Emergency Contact</span>
                    <strong>{user?.emergencyContact || '9876543211 (Family)'}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Registered Address</span>
                    <strong>{user?.address || 'Pune, Maharashtra, India'}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
                  🔒 MediLink CARE administrative profile data is stored with zero clinical diagnostic annotations for complete privacy.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Booking Appointment Modal */}
      {showBookingModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                Schedule OPD Appointment
              </h3>
              <button onClick={() => setShowBookingModal(false)} className="btn btn-secondary btn-icon" aria-label="Close">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleBookAppointment}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Target Healthcare Facility</label>
                <select
                  className="form-control"
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  required
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Preferred Time</label>
                  <select
                    className="form-control"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  >
                    {['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '05:00 PM'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Appointment Purpose</label>
                <input
                  type="text"
                  className="form-control"
                  value={appointmentPurpose}
                  onChange={(e) => setAppointmentPurpose(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Specialist / OPD Desk</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. General OPD Desk, Cardiology OPD"
                  value={specialistName}
                  onChange={(e) => setSpecialistName(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowBookingModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={bookingLoading}>
                  {bookingLoading ? 'Scheduling...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
