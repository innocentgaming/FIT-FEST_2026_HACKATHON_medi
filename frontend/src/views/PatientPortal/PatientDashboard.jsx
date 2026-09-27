import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEmergency } from '../../context/EmergencyContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { LiveMap } from '../../components/LiveMap';
import {
  Calendar,
  Clock,
  Building2,
  Droplet,
  Truck,
  AlertCircle,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Phone,
  User,
  Activity
} from 'lucide-react';

export const PatientDashboard = () => {
  const { user } = useAuth();
  const { openEmergencyMode } = useEmergency();
  const { liveResourceUpdate, liveBloodBankUpdate, liveRequestUpdate, liveLocationUpdate } = useSocket();

  const [activeTab, setActiveTab] = useState('APPOINTMENTS'); // APPOINTMENTS, HOSPITALS, BLOOD, AMBULANCE, PROFILE
  const [appointments, setAppointments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const activeAmbulanceRequests = myRequests.filter((r) => r.type === 'AMBULANCE');

  return (
    <div>
      {/* Patient Welcome & Emergency Banner */}
      <div
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
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="role-pill role-patient">PATIENT PORTAL</span>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>ID: {user?.id}</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.35rem' }}>Welcome, {user?.name}</h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>
            Blood Group: <strong style={{ color: '#ef4444' }}>{user?.bloodGroup || 'B+'}</strong> • Location: Pune, Maharashtra
          </p>
        </div>

        <button
          onClick={() => openEmergencyMode('AMBULANCE')}
          className="emergency-mode-btn"
          style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
        >
          <AlertCircle size={20} />
          <span>ACTIVATE EMERGENCY MODE</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'APPOINTMENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('APPOINTMENTS')}
        >
          <Calendar size={16} /> Appointments & Visits ({appointments.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'HOSPITALS' ? 'active' : ''}`}
          onClick={() => setActiveTab('HOSPITALS')}
        >
          <Building2 size={16} /> Hospital & Live Bed Finder
        </button>

        <button
          className={`tab-btn ${activeTab === 'BLOOD' ? 'active' : ''}`}
          onClick={() => { setActiveTab('BLOOD'); if (bloodMatches.length === 0) handleRunBloodSearch(); }}
        >
          <Droplet size={16} /> Smart Blood Requirement Matcher
        </button>

        <button
          className={`tab-btn ${activeTab === 'AMBULANCE' ? 'active' : ''}`}
          onClick={() => setActiveTab('AMBULANCE')}
        >
          <Truck size={16} /> Ambulance Dispatch & Live Tracking ({activeAmbulanceRequests.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'PROFILE' ? 'active' : ''}`}
          onClick={() => setActiveTab('PROFILE')}
        >
          <User size={16} /> Administrative Record
        </button>
      </div>

      {/* TAB 1: APPOINTMENTS */}
      {activeTab === 'APPOINTMENTS' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Your Clinic & Hospital Appointments</h3>
            <button
              onClick={() => {
                setSelectedDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
                setShowBookingModal(true);
              }}
              className="btn btn-primary btn-sm"
            >
              <Plus size={16} /> Book New Appointment
            </button>
          </div>

          {appointments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Calendar size={36} color="#64748b" style={{ margin: '0 auto 0.75rem' }} />
              <h4>No appointments booked yet</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.25rem' }}>
                Schedule a routine consultation desk appointment with clinics across the network.
              </p>
            </div>
          ) : (
            <div className="table-responsive card" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hospital / Clinic</th>
                    <th>Specialist / Department</th>
                    <th>Date & Time</th>
                    <th>Administrative Purpose</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt.id}>
                      <td>
                        <strong style={{ color: '#38bdf8' }}>{apt.hospitalName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: #{apt.id}</div>
                      </td>
                      <td>
                        <div>{apt.specialistName || 'OPD Desk'}</div>
                        <span style={{ fontSize: '0.75rem', color: '#a78bfa' }}>{apt.specialty}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>📅 {apt.date}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>⏰ {apt.time}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{apt.purpose}</td>
                      <td>
                        <StatusBadge status={apt.status} />
                      </td>
                      <td>
                        {apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED' ? (
                          <button
                            onClick={() => handleCancelAppointment(apt.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                          >
                            Cancel
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>No action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HOSPITALS & LIVE BED FINDER */}
      {activeTab === 'HOSPITALS' && (
        <div>
          {/* Advanced Search & Filtering Bar */}
          <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#38bdf8' }}>
                🏥 Hospital & Critical Care Facility Search
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.3rem 0.6rem', borderRadius: '12px' }}>
                ⚡ Live Beds Telemetry Active
              </span>
            </div>

            <div className="grid-4" style={{ gap: '0.75rem' }}>
              <div style={{ minWidth: '200px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Search Name / Area / Equipment</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ruby Hall, KEM, Deccan, MRI, ICU..."
                  value={hospitalQuery}
                  onChange={(e) => setHospitalQuery(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Bed / Equipment Availability</label>
                <select
                  className="form-select"
                  value={bedTypeFilter}
                  onChange={(e) => setBedTypeFilter(e.target.value)}
                >
                  <option value="">All Bed Types</option>
                  <option value="ICU">Available ICU Beds Only</option>
                  <option value="VENTILATOR">Available Ventilators Only</option>
                  <option value="OXYGEN">Available Oxygen Only</option>
                  <option value="GENERAL">Available General Beds</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Blood Stock Availability</label>
                <select
                  className="form-select"
                  value={bloodGroupFilter}
                  onChange={(e) => setBloodGroupFilter(e.target.value)}
                >
                  <option value="">All Blood Groups</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>Has {bg} Stock</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Specialist Department</label>
                <select
                  className="form-select"
                  value={specialistFilter}
                  onChange={(e) => setSpecialistFilter(e.target.value)}
                >
                  <option value="">All Specialties</option>
                  <option value="Cardiology">Cardiology & Cardiac</option>
                  <option value="Neurology">Neurology & Stroke</option>
                  <option value="Orthopedics">Orthopedics & Trauma</option>
                  <option value="Pediatrics">Pediatrics & Neonatal</option>
                  <option value="Nephrology">Nephrology & Dialysis</option>
                  <option value="Pulmonology">Pulmonology & Respiratory</option>
                  <option value="General">General Medicine & OPD</option>
                </select>
              </div>
            </div>

            {(hospitalQuery || bedTypeFilter || bloodGroupFilter || specialistFilter) && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Active Filters:</span>
                <button
                  onClick={() => {
                    setHospitalQuery('');
                    setBedTypeFilter('');
                    setBloodGroupFilter('');
                    setSpecialistFilter('');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>

          <div className="grid-2">
            {filteredHospitals.map((h) => (
              <div key={h.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span className="role-pill role-hospital" style={{ fontSize: '0.68rem', marginBottom: '0.35rem' }}>
                        {h.type || 'Tertiary Care Hospital'}
                      </span>
                      <h3 style={{ fontSize: '1.2rem', color: '#38bdf8', marginTop: '0.2rem' }}>{h.name}</h3>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>📍 {h.address}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <a
                        href={h.mapUrl || `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }}
                        title="Open in Google Maps"
                      >
                        🗺️ Map
                      </a>
                      <a href={`tel:${h.emergencyHelpline}`} className="btn btn-danger btn-sm">
                        <Phone size={14} /> {h.emergencyHelpline || h.phone}
                      </a>
                    </div>
                  </div>

                  {/* Live Resources Telemetry */}
                  <div className="grid-4" style={{ marginTop: '1rem', gap: '0.4rem' }}>
                    <div style={{ background: 'var(--bg-subtle)', padding: '0.5rem 0.4rem', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>General Beds</span>
                      <strong style={{ fontSize: '1.15rem', color: '#38bdf8' }}>
                        {h.resources?.generalBedsAvailable ?? 0}/{h.resources?.generalBedsTotal ?? 100}
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.5rem 0.4rem', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#fca5a5', display: 'block' }}>ICU Beds</span>
                      <strong style={{ fontSize: '1.15rem', color: '#ef4444' }}>
                        {h.resources?.icuBedsAvailable ?? 0}/{h.resources?.icuBedsTotal ?? 20}
                      </strong>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '0.5rem 0.4rem', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Ventilators</span>
                      <strong style={{ fontSize: '1.15rem', color: '#a78bfa' }}>
                        {h.resources?.ventilatorsAvailable ?? 0}/{h.resources?.ventilatorsTotal ?? 10}
                      </strong>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '0.5rem 0.4rem', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Oxygen Cyl.</span>
                      <strong style={{ fontSize: '1.15rem', color: '#34d399' }}>
                        {h.resources?.oxygenCylindersAvailable ?? 0}/{h.resources?.oxygenCylindersTotal ?? 50}
                      </strong>
                    </div>
                  </div>

                  {/* Equipment Badges */}
                  {h.equipment && h.equipment.length > 0 && (
                    <div style={{ marginTop: '0.85rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Specialized Equipment:</div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {h.equipment.map((eq) => (
                          <span
                            key={eq}
                            style={{
                              fontSize: '0.72rem',
                              background: 'rgba(56, 189, 248, 0.08)',
                              color: '#93c5fd',
                              border: '1px solid rgba(56, 189, 248, 0.2)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px'
                            }}
                          >
                            ⚙️ {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blood Bank Live Stock Preview */}
                  {h.bloodBank && (
                    <div style={{ marginTop: '0.85rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>🩸 Blood Stock Available (Units):</div>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                          <span
                            key={bg}
                            style={{
                              fontSize: '0.7rem',
                              background: (h.bloodBank[bg] || 0) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                              color: (h.bloodBank[bg] || 0) > 0 ? '#fca5a5' : '#64748b',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              fontWeight: 600
                            }}
                          >
                            {bg}: <b>{h.bloodBank[bg] ?? 0}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Specialists Available */}
                  {h.specialists && h.specialists.length > 0 && (
                    <div style={{ marginTop: '0.85rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>👨‍⚕️ Specialists Roster:</div>
                      <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                        {h.specialists.map((s) => `${s.name} (${s.specialty})`).join(' • ')}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    ⚡ Real-time Socket.io synchronized
                  </div>
                  <button
                    onClick={() => {
                      setSelectedHospitalId(h.id);
                      setSelectedDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
                      setShowBookingModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    📅 Book Appointment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SMART BLOOD REQUIREMENT MATCHER */}
      {activeTab === 'BLOOD' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#f87171' }}>
                🩸 Smart Blood Requirement Matcher
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1', background: 'rgba(239, 68, 68, 0.15)', padding: '0.25rem 0.6rem', borderRadius: '12px' }}>
                Verified Cold Storage Telemetry (MVP Seeded Data)
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Submit emergency or scheduled blood requirements. Matches are sorted by practical relevance, location proximity, and live available units:
            </p>

            <form onSubmit={handleRunBloodSearch}>
              <div className="grid-4" style={{ gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Blood Group</label>
                  <select
                    className="form-select"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Units Required</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="form-control"
                    value={bloodUnits}
                    onChange={(e) => setBloodUnits(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Location / City / Area</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Pune, Deccan, Sangamvadi, Camp..."
                    value={bloodLocation}
                    onChange={(e) => setBloodLocation(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Urgency Level</label>
                  <select
                    className="form-select"
                    value={bloodUrgency}
                    onChange={(e) => setBloodUrgency(e.target.value)}
                  >
                    <option value="NORMAL">NORMAL (Scheduled / Elective)</option>
                    <option value="URGENT">URGENT (Within 2-4 Hours)</option>
                    <option value="CRITICAL">CRITICAL (Immediate Life Support)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={bloodSearchLoading}
                  className="btn btn-primary"
                  style={{ minWidth: '180px' }}
                >
                  {bloodSearchLoading ? 'Searching Stock...' : '🔍 Find Matching Blood Banks'}
                </button>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Example: <b>B+ | 2 Units | Pune | URGENT</b>
                </span>
              </div>
            </form>
          </div>

          <div className="table-responsive card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hospital / Blood Bank</th>
                  <th>Location & Area</th>
                  <th>Blood Group</th>
                  <th>Available Units</th>
                  <th>Match Status</th>
                  <th>ICU / Critical Telemetry</th>
                  <th>Helpline & Direct Call</th>
                </tr>
              </thead>
              <tbody>
                {bloodMatches.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Click "Find Matching Blood Banks" to view real-time facility inventory.
                    </td>
                  </tr>
                ) : (
                  bloodMatches.map((m) => (
                    <tr key={m.hospitalId}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#38bdf8' }}>{m.hospitalName}</div>
                        <a
                          href={m.mapUrl || `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.75rem', color: '#93c5fd', textDecoration: 'underline' }}
                        >
                          🗺️ View on Map
                        </a>
                      </td>
                      <td>
                        <div><b>{m.area}</b></div>
                        <small style={{ color: '#94a3b8' }}>{m.city}</small>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '1.1rem' }}>{m.bloodGroup}</span>
                      </td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                        <span style={{ color: m.availableUnits >= bloodUnits ? '#10b981' : (m.availableUnits > 0 ? '#f59e0b' : '#ef4444') }}>
                          {m.availableUnits} Units
                        </span>
                      </td>
                      <td>
                        {m.isSufficient ? (
                          <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem', background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            ✅ Full Match ({m.availableUnits} ≥ {bloodUnits})
                          </span>
                        ) : m.availableUnits > 0 ? (
                          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem', background: 'rgba(245,158,11,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            ⚠️ Partial ({m.availableUnits}/{bloodUnits})
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8rem' }}>
                            ❌ Out of Stock
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                        <div>ICU: <b>{m.resources?.icuBedsAvailable ?? 0}</b> avail</div>
                        <div>O2: <b>{m.resources?.oxygenCylindersAvailable ?? 0}</b> cyl</div>
                      </td>
                      <td>
                        <a
                          href={`tel:${m.emergencyHelpline}`}
                          className="btn btn-danger btn-sm"
                          style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Phone size={13} /> {m.emergencyHelpline || m.phone}
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AMBULANCE DISPATCH & LIVE TRACKING */}
      {activeTab === 'AMBULANCE' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Ambulance Dispatch & Simulated GPS Tracking</h3>
            <button onClick={() => openEmergencyMode('AMBULANCE')} className="btn btn-danger btn-sm">
              <Plus size={16} /> Request Emergency Ambulance
            </button>
          </div>

          {/* Interactive Map */}
          <div style={{ marginBottom: '1.5rem' }}>
            <LiveMap
              hospitals={hospitals}
              ambulances={ambulances}
              activeRequest={activeAmbulanceRequests[0] || null}
              height="350px"
            />
          </div>

          {activeAmbulanceRequests.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <Truck size={36} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
              <h4>No active ambulance requests</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Use Emergency Mode to dispatch an ambulance with live GPS tracking.
              </p>
            </div>
          ) : (
            <div className="grid-2">
              {activeAmbulanceRequests.map((req) => (
                <div key={req.id} className="card" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <StatusBadge status={req.status} tripStatus={req.ambulanceTripStatus} />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>#{req.id}</span>
                  </div>

                  <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <div>📍 Pickup: <strong>{req.details?.pickupLocation}</strong></div>
                    <div>🏥 Destination: <strong>{req.targetHospitalName}</strong></div>
                    <div>🚑 Vehicle: <strong>{req.assignedAmbulanceVehicle || 'Unit Assigned'}</strong></div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.25rem' }}>
                      Dispatch Progression:
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                      {req.responseNotes || 'Ambulance is progressing towards destination.'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ADMINISTRATIVE PROFILE */}
      {activeTab === 'PROFILE' && (
        <div className="card" style={{ maxWidth: '640px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Patient Administrative Record</h3>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Patient Name</label>
              <input type="text" className="form-control" value={user?.name || ''} readOnly />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="text" className="form-control" value={user?.phone || ''} readOnly />
            </div>

            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <input type="text" className="form-control" value={user?.bloodGroup || 'B+'} readOnly />
            </div>

            <div className="form-group">
              <label className="form-label">Emergency Contact</label>
              <input type="text" className="form-control" value={user?.emergencyContact || 'Not Specified'} readOnly />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Registered Address</label>
            <input type="text" className="form-control" value={user?.address || 'Pune, Maharashtra'} readOnly />
          </div>

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
            🔒 <strong>Administrative Scope:</strong> Records are securely stored for appointment logistics and emergency facility lookup. MediLink does not store clinical diagnosis records.
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {showBookingModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Book Administrative Appointment</h3>
              <button onClick={() => setShowBookingModal(false)} className="btn btn-secondary btn-icon">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleBookAppointment}>
              <div className="form-group">
                <label className="form-label">Hospital / Clinic</label>
                <select
                  className="form-select"
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  required
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Time Slot</label>
                  <select
                    className="form-select"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  >
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Purpose (Administrative Only)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Routine OPD Consultation Desk, Checkup Intake"
                  value={appointmentPurpose}
                  onChange={(e) => setAppointmentPurpose(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {bookingLoading ? 'Scheduling...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
