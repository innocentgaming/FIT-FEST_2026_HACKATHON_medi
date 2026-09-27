import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEmergency } from '../../context/EmergencyContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Building2,
  Bed,
  Activity,
  Droplet,
  Calendar,
  Truck,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Send,
  AlertTriangle,
  Search,
  User,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

export const HospitalDashboard = () => {
  const { user } = useAuth();
  const { openEmergencyMode } = useEmergency();
  const { liveResourceUpdate, liveBloodBankUpdate, liveRequestUpdate } = useSocket();

  const [activeTab, setActiveTab] = useState('RESOURCES'); // RESOURCES, APPOINTMENTS, REQUESTS, PATIENTS_SEARCH, SPECIALISTS
  const [summary, setSummary] = useState(null);
  const [resources, setResources] = useState({});
  const [equipment, setEquipment] = useState([]);
  const [newEquipmentInput, setNewEquipmentInput] = useState('');
  const [bloodBank, setBloodBank] = useState({});
  const [requests, setRequests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentSummary, setAppointmentSummary] = useState({});
  const [appointmentFilter, setAppointmentFilter] = useState('ALL'); // ALL, TODAY, UPCOMING, COMPLETED, CANCELLED, NO_SHOW, FOLLOW_UP
  const [specialists, setSpecialists] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Patient Search State
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetReqId, setRejectTargetReqId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Add Specialist Modal
  const [showSpecialistModal, setShowSpecialistModal] = useState(false);
  const [specName, setSpecName] = useState('');
  const [specSpecialty, setSpecSpecialty] = useState('');
  const [specTiming, setSpecTiming] = useState('10:00 AM - 04:00 PM');

  const hospitalId = user?.hospitalId || 'hosp_ruby_hall';

  useEffect(() => {
    loadHospitalData();
  }, [hospitalId]);

  useEffect(() => {
    if (liveResourceUpdate && liveResourceUpdate.hospitalId === hospitalId) {
      setResources(liveResourceUpdate.resources);
    }
  }, [liveResourceUpdate, hospitalId]);

  useEffect(() => {
    if (liveBloodBankUpdate && liveBloodBankUpdate.hospitalId === hospitalId) {
      setBloodBank(liveBloodBankUpdate.bloodBank);
    }
  }, [liveBloodBankUpdate, hospitalId]);

  useEffect(() => {
    if (liveRequestUpdate) {
      loadHospitalData();
    }
  }, [liveRequestUpdate]);

  const loadHospitalData = async () => {
    try {
      setLoading(true);
      const [sum, apts, reqs, ambRes] = await Promise.all([
        api.getHospitalSummary(hospitalId),
        api.getAppointments({ hospitalId }),
        api.getRequests(),
        api.getAmbulances({ hospitalId })
      ]);

      setSummary(sum);
      setResources(sum.resources || {});
      setEquipment(sum.equipment || sum.hospital?.equipment || []);
      setBloodBank(sum.bloodBank || {});
      setSpecialists(sum.specialists || []);
      setAppointments(apts.appointments || []);
      setAppointmentSummary(apts.summary || {});
      setRequests(reqs.requests || []);
      setAmbulances(ambRes.ambulances?.filter((a) => a.hospitalId === hospitalId) || []);
    } catch (err) {
      console.error('Error loading hospital portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAmbulanceStatusChange = async (ambId, newStatus) => {
    try {
      const res = await api.updateAmbulanceStatus(ambId, newStatus);
      setAmbulances((prev) => prev.map((a) => (a.id === ambId ? res.ambulance : a)));
    } catch (err) {
      alert('Error updating ambulance status: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleResourceCountChange = async (key, delta) => {
    const currentVal = resources[key] || 0;
    const newVal = Math.max(0, currentVal + delta);
    const updated = { ...resources, [key]: newVal };
    setResources(updated);

    try {
      await api.updateHospitalResources(hospitalId, updated);
    } catch (err) {
      console.error('Error updating live resources:', err);
      setResources(resources);
    }
  };

  const handleAddEquipment = async (e) => {
    if (e) e.preventDefault();
    if (!newEquipmentInput.trim()) return;
    const updatedEquipment = [...equipment, newEquipmentInput.trim()];
    setEquipment(updatedEquipment);
    setNewEquipmentInput('');
    try {
      await api.updateHospitalResources(hospitalId, { ...resources, equipment: updatedEquipment });
    } catch (err) {
      console.error('Error adding equipment:', err);
    }
  };

  const handleRemoveEquipment = async (itemToRemove) => {
    const updatedEquipment = equipment.filter((item) => item !== itemToRemove);
    setEquipment(updatedEquipment);
    try {
      await api.updateHospitalResources(hospitalId, { ...resources, equipment: updatedEquipment });
    } catch (err) {
      console.error('Error removing equipment:', err);
    }
  };

  const handleBloodStockChange = async (group, delta) => {
    const currentUnits = bloodBank[group] || 0;
    const newUnits = Math.max(0, currentUnits + delta);
    const updated = { ...bloodBank, [group]: newUnits };
    setBloodBank(updated);

    try {
      await api.updateHospitalBloodBank(hospitalId, updated);
    } catch (err) {
      console.error('Error updating blood bank stock:', err);
      setBloodBank(bloodBank);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.updateRequestStatus(requestId, {
        status: 'ACCEPTED',
        responseNotes: `Accepted by ${user.name}. Bed allocated.`
      });
      loadHospitalData();
    } catch (err) {
      alert('Error accepting request: ' + err.message);
    }
  };

  const handleOpenRejectModal = (requestId) => {
    setRejectTargetReqId(requestId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      alert('Rejection requires a mandatory response note.');
      return;
    }
    setRejectLoading(true);
    try {
      await api.updateRequestStatus(rejectTargetReqId, {
        status: 'REJECTED',
        responseNotes: rejectReason
      });
      setRejectModalOpen(false);
      loadHospitalData();
    } catch (err) {
      alert('Error rejecting request: ' + err.message);
    } finally {
      setRejectLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (id, status, note = '') => {
    try {
      await api.updateAppointmentStatus(id, status, note);
      loadHospitalData();
    } catch (err) {
      alert('Error updating appointment status: ' + err.message);
    }
  };

  const handlePatientSearch = async (e) => {
    if (e) e.preventDefault();
    setPatientSearchLoading(true);
    try {
      const res = await fetch(`/api/patients/search?query=${encodeURIComponent(patientSearchQuery)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('medilink_token')}` }
      }).then((r) => r.json());
      setPatientSearchResults(res.results || []);
    } catch (err) {
      console.error('Error searching patients:', err);
    } finally {
      setPatientSearchLoading(false);
    }
  };

  const handleAddSpecialist = async (e) => {
    e.preventDefault();
    try {
      await api.addSpecialist(hospitalId, {
        name: specName,
        specialty: specSpecialty,
        timing: specTiming
      });
      setShowSpecialistModal(false);
      setSpecName('');
      setSpecSpecialty('');
      loadHospitalData();
    } catch (err) {
      alert('Error adding specialist: ' + err.message);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAppointments = appointments.filter((a) => {
    const aDate = a.appointmentDate || a.date;
    if (appointmentFilter === 'TODAY') return aDate === todayStr;
    if (appointmentFilter === 'UPCOMING') return aDate >= todayStr && ['SCHEDULED', 'CONFIRMED'].includes(a.status);
    if (appointmentFilter === 'COMPLETED') return a.status === 'COMPLETED';
    if (appointmentFilter === 'CANCELLED') return a.status === 'CANCELLED';
    if (appointmentFilter === 'NO_SHOW') return a.status === 'NO_SHOW';
    if (appointmentFilter === 'FOLLOW_UP') return a.status === 'FOLLOW_UP';
    return true;
  });

  const pendingInboundRequests = requests.filter(
    (r) => r.targetHospitalId === hospitalId && r.status === 'PENDING'
  );

  return (
    <div>
      {/* Header Profile */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #111927 0%, #064e3b 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
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
            <span className="role-pill role-hospital">CLINIC & HOSPITAL DESK</span>
            <span style={{ color: '#a7f3d0', fontSize: '0.8rem' }}>Facility ID: {hospitalId}</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.35rem' }}>
            {summary?.hospital?.name || user?.name}
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>
            {summary?.hospital?.address || 'Pune Healthcare Network'} • Helpline: {summary?.hospital?.emergencyHelpline || '1066'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => openEmergencyMode('AMBULANCE')}
            className="emergency-mode-btn"
            style={{ padding: '0.65rem 1.15rem', fontSize: '0.88rem' }}
          >
            <AlertCircle size={18} />
            <span>EMERGENCY COORDINATION</span>
          </button>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.85rem', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>Today's Appts</div>
            <strong style={{ fontSize: '1.3rem', color: '#f8fafc' }}>{appointmentSummary.today ?? 0}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.85rem', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>Inbound Pending</div>
            <strong style={{ fontSize: '1.3rem', color: '#fca5a5' }}>{pendingInboundRequests.length}</strong>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'APPOINTMENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('APPOINTMENTS')}
        >
          <Calendar size={16} /> Clinic Appointments ({appointments.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'RESOURCES' ? 'active' : ''}`}
          onClick={() => setActiveTab('RESOURCES')}
        >
          <Activity size={16} /> Live Resources & Blood Stock
        </button>

        <button
          className={`tab-btn ${activeTab === 'REQUESTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('REQUESTS')}
        >
          <Send size={16} /> Inbound Emergency Queue ({pendingInboundRequests.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'PATIENTS_SEARCH' ? 'active' : ''}`}
          onClick={() => { setActiveTab('PATIENTS_SEARCH'); handlePatientSearch(); }}
        >
          <Search size={16} /> Patient Directory Search
        </button>

        <button
          className={`tab-btn ${activeTab === 'SPECIALISTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('SPECIALISTS')}
        >
          <UserCheck size={16} /> Specialists Roster ({specialists.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'AMBULANCES' ? 'active' : ''}`}
          onClick={() => setActiveTab('AMBULANCES')}
        >
          <Truck size={16} /> Facility Ambulances ({ambulances.length})
        </button>
      </div>

      {/* TAB 1: CLINIC APPOINTMENTS & SMART BREAKDOWN */}
      {activeTab === 'APPOINTMENTS' && (
        <div>
          {/* Appointment Breakdown Cards */}
          <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
            <div
              className="card"
              style={{
                padding: '0.85rem',
                cursor: 'pointer',
                border: appointmentFilter === 'TODAY' ? '1px solid #38bdf8' : '1px solid var(--border-card)',
                background: appointmentFilter === 'TODAY' ? 'var(--bg-card-hover)' : 'var(--bg-subtle)'
              }}
              onClick={() => setAppointmentFilter(appointmentFilter === 'TODAY' ? 'ALL' : 'TODAY')}
            >
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>📅 Today's Appointments</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '2px', color: '#f8fafc' }}>
                {appointmentSummary.today ?? 0}
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '0.85rem',
                cursor: 'pointer',
                border: appointmentFilter === 'UPCOMING' ? '1px solid #a78bfa' : '1px solid var(--border-card)',
                background: appointmentFilter === 'UPCOMING' ? 'var(--bg-card-hover)' : 'var(--bg-subtle)'
              }}
              onClick={() => setAppointmentFilter(appointmentFilter === 'UPCOMING' ? 'ALL' : 'UPCOMING')}
            >
              <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>⏳ Upcoming</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '2px', color: '#f8fafc' }}>
                {appointmentSummary.upcoming ?? 0}
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '0.85rem',
                cursor: 'pointer',
                border: appointmentFilter === 'COMPLETED' ? '1px solid #34d399' : '1px solid var(--border-card)',
                background: appointmentFilter === 'COMPLETED' ? 'var(--bg-card-hover)' : 'var(--bg-subtle)'
              }}
              onClick={() => setAppointmentFilter(appointmentFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            >
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>✅ Completed</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '2px', color: '#f8fafc' }}>
                {appointmentSummary.completed ?? 0}
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: '0.85rem',
                cursor: 'pointer',
                border: appointmentFilter === 'FOLLOW_UP' ? '1px solid #fbbf24' : '1px solid var(--border-card)',
                background: appointmentFilter === 'FOLLOW_UP' ? 'var(--bg-card-hover)' : 'var(--bg-subtle)'
              }}
              onClick={() => setAppointmentFilter(appointmentFilter === 'FOLLOW_UP' ? 'ALL' : 'FOLLOW_UP')}
            >
              <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>🔄 Follow-Ups</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '2px', color: '#f8fafc' }}>
                {appointmentSummary.followUp ?? 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              Showing {filteredAppointments.length} appointment records (Filter: <b>{appointmentFilter}</b>)
            </div>
            {appointmentFilter !== 'ALL' && (
              <button onClick={() => setAppointmentFilter('ALL')} className="btn btn-secondary btn-sm">
                Clear Filter
              </button>
            )}
          </div>

          <div className="table-responsive card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Appt ID</th>
                  <th>Patient Name & Phone</th>
                  <th>Date & Time</th>
                  <th>Department / Desk</th>
                  <th>Administrative Purpose</th>
                  <th>Status</th>
                  <th>1-Click Status Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id}>
                    <td>
                      <strong>#{apt.id}</strong>
                    </td>
                    <td>
                      <div><strong>{apt.patientName}</strong></div>
                      <small style={{ color: '#94a3b8' }}>{apt.patientPhone}</small>
                    </td>
                    <td>
                      <div>📅 {apt.appointmentDate || apt.date}</div>
                      <small style={{ color: '#94a3b8' }}>⏰ {apt.appointmentTime || apt.time}</small>
                    </td>
                    <td>
                      <div>{apt.specialty}</div>
                      <small style={{ color: '#a78bfa' }}>{apt.specialistName}</small>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{apt.purpose}</td>
                    <td>
                      <StatusBadge status={apt.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {apt.status === 'SCHEDULED' && (
                          <>
                            <button
                              onClick={() => handleUpdateAppointmentStatus(apt.id, 'CONFIRMED')}
                              className="btn btn-primary btn-sm"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleUpdateAppointmentStatus(apt.id, 'NO_SHOW')}
                              className="btn btn-secondary btn-sm"
                            >
                              No-Show
                            </button>
                          </>
                        )}
                        {apt.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => handleUpdateAppointmentStatus(apt.id, 'COMPLETED')}
                              className="btn btn-success btn-sm"
                            >
                              Mark Done
                            </button>
                            <button
                              onClick={() => handleUpdateAppointmentStatus(apt.id, 'FOLLOW_UP')}
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#fbbf24' }}
                            >
                              Follow-Up
                            </button>
                          </>
                        )}
                        {apt.status === 'FOLLOW_UP' && (
                          <button
                            onClick={() => handleUpdateAppointmentStatus(apt.id, 'COMPLETED')}
                            className="btn btn-success btn-sm"
                          >
                            Close Follow-Up
                          </button>
                        )}
                        {['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status) && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Archived</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE RESOURCES & BLOOD BANK */}
      {activeTab === 'RESOURCES' && (
        <div>
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>
                Hospital Bed & Equipment Telemetry (Socket.io Synced)
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Adjust live counts below. Changes instantly broadcast across the network for emergency triage:
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.3)' }}>
              ⚡ Live Socket.io Telemetry Active
            </span>
          </div>

          <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
            {/* General Beds */}
            <div className="resource-counter-card">
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>🛏️ General Beds</span>
              <div className="resource-count-number" style={{ color: '#38bdf8' }}>
                {resources.generalBedsAvailable ?? 0}
                <span style={{ fontSize: '1rem', color: '#64748b' }}>/{resources.generalBedsTotal ?? 100}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Available: <b>{resources.generalBedsAvailable ?? 0}</b> | Total: <b>{resources.generalBedsTotal ?? 100}</b>
              </div>
              <div className="resource-controls">
                <button
                  onClick={() => handleResourceCountChange('generalBedsAvailable', -1)}
                  className="btn-counter"
                  aria-label="Decrease available general beds"
                  title="Decrease available beds"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => handleResourceCountChange('generalBedsAvailable', 1)}
                  className="btn-counter"
                  aria-label="Increase available general beds"
                  title="Increase available beds"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => handleResourceCountChange('generalBedsTotal', 1)}
                  className="btn btn-secondary btn-sm"
                  style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  title="Increase total general bed capacity"
                >
                  + Cap
                </button>
              </div>
            </div>

            {/* ICU Beds */}
            <div className="resource-counter-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              <span style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: 600 }}>🚨 ICU Beds</span>
              <div className="resource-count-number" style={{ color: '#ef4444' }}>
                {resources.icuBedsAvailable ?? 0}
                <span style={{ fontSize: '1rem', color: '#64748b' }}>/{resources.icuBedsTotal ?? 20}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginBottom: '0.5rem' }}>
                Available: <b>{resources.icuBedsAvailable ?? 0}</b> | Total: <b>{resources.icuBedsTotal ?? 20}</b>
              </div>
              <div className="resource-controls">
                <button
                  onClick={() => handleResourceCountChange('icuBedsAvailable', -1)}
                  className="btn-counter"
                  aria-label="Decrease available ICU beds"
                  title="Decrease available ICU beds"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => handleResourceCountChange('icuBedsAvailable', 1)}
                  className="btn-counter"
                  aria-label="Increase available ICU beds"
                  title="Increase available ICU beds"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => handleResourceCountChange('icuBedsTotal', 1)}
                  className="btn btn-secondary btn-sm"
                  style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  title="Increase total ICU bed capacity"
                >
                  + Cap
                </button>
              </div>
            </div>

            {/* Ventilators */}
            <div className="resource-counter-card">
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>💨 Ventilators</span>
              <div className="resource-count-number" style={{ color: '#a78bfa' }}>
                {resources.ventilatorsAvailable ?? 0}
                <span style={{ fontSize: '1rem', color: '#64748b' }}>/{resources.ventilatorsTotal ?? 10}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Available: <b>{resources.ventilatorsAvailable ?? 0}</b> | Total: <b>{resources.ventilatorsTotal ?? 10}</b>
              </div>
              <div className="resource-controls">
                <button
                  onClick={() => handleResourceCountChange('ventilatorsAvailable', -1)}
                  className="btn-counter"
                  aria-label="Decrease ventilators"
                  title="Decrease available ventilators"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => handleResourceCountChange('ventilatorsAvailable', 1)}
                  className="btn-counter"
                  aria-label="Increase ventilators"
                  title="Increase available ventilators"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => handleResourceCountChange('ventilatorsTotal', 1)}
                  className="btn btn-secondary btn-sm"
                  style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  title="Increase total ventilators"
                >
                  + Cap
                </button>
              </div>
            </div>

            {/* Oxygen Cylinders */}
            <div className="resource-counter-card">
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>🫧 Oxygen Supply / Cylinders</span>
              <div className="resource-count-number" style={{ color: '#34d399' }}>
                {resources.oxygenCylindersAvailable ?? 0}
                <span style={{ fontSize: '1rem', color: '#64748b' }}>/{resources.oxygenCylindersTotal ?? 50}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Available: <b>{resources.oxygenCylindersAvailable ?? 0}</b> | Total: <b>{resources.oxygenCylindersTotal ?? 50}</b>
              </div>
              <div className="resource-controls">
                <button
                  onClick={() => handleResourceCountChange('oxygenCylindersAvailable', -1)}
                  className="btn-counter"
                  aria-label="Decrease oxygen cylinders"
                  title="Decrease oxygen cylinders"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => handleResourceCountChange('oxygenCylindersAvailable', 1)}
                  className="btn-counter"
                  aria-label="Increase oxygen cylinders"
                  title="Increase oxygen cylinders"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => handleResourceCountChange('oxygenCylindersTotal', 5)}
                  className="btn btn-secondary btn-sm"
                  style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  title="Increase total oxygen cylinders (+5)"
                >
                  +5 Cap
                </button>
              </div>
            </div>
          </div>

          {/* Blood Bank Matrix */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div className="card-title">
                <Droplet size={20} color="#ef4444" />
                <span>Hospital Blood Bank Inventory Matrix (8 Groups Supported)</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Units in cold storage</span>
            </div>

            <div className="blood-grid">
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                <div key={group} className="blood-card">
                  <div className="blood-group-badge">{group}</div>
                  <div className="blood-units-count">
                    <strong style={{ fontSize: '1.2rem', color: '#f8fafc' }}>{bloodBank[group] ?? 0}</strong> Units
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => handleBloodStockChange(group, -1)}
                      className="btn-counter"
                      style={{ width: '26px', height: '26px' }}
                      title="Decrease 1 unit"
                    >
                      <Minus size={12} />
                    </button>
                    <button
                      onClick={() => handleBloodStockChange(group, 1)}
                      className="btn-counter"
                      style={{ width: '26px', height: '26px' }}
                      title="Add 1 unit"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Specialized Equipment Management */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Activity size={20} color="#38bdf8" />
                <span>Specialized Diagnostic & ICU Equipment</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Visible to emergency referral network</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {equipment && equipment.length > 0 ? (
                equipment.map((item) => (
                  <span
                    key={item}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    ⚙️ {item}
                    <button
                      onClick={() => handleRemoveEquipment(item)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                      title="Remove equipment"
                    >
                      <XCircle size={14} />
                    </button>
                  </span>
                ))
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No equipment configured yet.</span>
              )}
            </div>

            <form onSubmit={handleAddEquipment} style={{ display: 'flex', gap: '0.75rem', maxWidth: '480px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Add specialized equipment (e.g. MRI 3T, CT Scanner, ECMO)..."
                value={newEquipmentInput}
                onChange={(e) => setNewEquipmentInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ minWidth: '130px' }}>
                <Plus size={16} /> Add Unit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: INBOUND EMERGENCY QUEUE */}
      {activeTab === 'REQUESTS' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Inbound Admission, Transfer & Emergency Queue</h3>
          </div>

          <div className="table-responsive card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID & Type</th>
                  <th>Patient / Source</th>
                  <th>Requirement Details</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <strong style={{ color: '#38bdf8' }}>#{req.id}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Type: {req.type}</div>
                    </td>
                    <td>
                      <div>{req.patientName}</div>
                      <small style={{ color: '#94a3b8' }}>{req.patientPhone || req.sourceHospitalName}</small>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {req.details?.bedType && <div>Bed: <b>{req.details.bedType}</b></div>}
                      {req.details?.bloodGroup && <div>Blood: <b>{req.details.bloodGroup} ({req.details.unitsRequired} Units)</b></div>}
                      <div style={{ color: '#cbd5e1' }}>{req.details?.reason || req.details?.emergencyType || 'Admission requisition'}</div>
                    </td>
                    <td>
                      <span style={{ color: req.priority === 'EMERGENCY' ? '#ef4444' : '#f59e0b', fontWeight: 700, fontSize: '0.8rem' }}>
                        {req.priority}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={req.status} tripStatus={req.ambulanceTripStatus} />
                    </td>
                    <td>
                      {req.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="btn btn-success btn-sm"
                          >
                            <CheckCircle size={14} /> Accept
                          </button>
                          <button
                            onClick={() => handleOpenRejectModal(req.id)}
                            className="btn btn-danger btn-sm"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {req.responseNotes || 'Completed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PATIENT DIRECTORY SEARCH */}
      {activeTab === 'PATIENTS_SEARCH' && (
        <div>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              🔍 Administrative Patient Directory Search
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Search registered patients by Name, Patient ID, or Phone for OPD intake & administrative appointments:
            </p>

            <form onSubmit={handlePatientSearch} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Enter patient name, ID (e.g. usr_patient_1), or 10-digit phone..."
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
              />
              <button type="submit" disabled={patientSearchLoading} className="btn btn-primary" style={{ minWidth: '120px' }}>
                <Search size={16} /> Search
              </button>
            </form>
          </div>

          <div className="table-responsive card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Full Name</th>
                  <th>Age</th>
                  <th>Phone Number</th>
                  <th>Blood Group</th>
                  <th>Emergency Contact</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {patientSearchResults.map((p) => (
                  <tr key={p.id}>
                    <td><code style={{ color: '#38bdf8' }}>{p.id}</code></td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.age || 28} yrs</td>
                    <td>{p.phone}</td>
                    <td><span style={{ color: '#ef4444', fontWeight: 700 }}>{p.bloodGroup || 'B+'}</span></td>
                    <td>{p.emergencyContact || 'Not recorded'}</td>
                    <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{p.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SPECIALISTS ROSTER */}
      {activeTab === 'SPECIALISTS' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Specialist Doctors & Department Schedules</h3>
            <button onClick={() => setShowSpecialistModal(true)} className="btn btn-primary btn-sm">
              <Plus size={16} /> Add Specialist
            </button>
          </div>

          <div className="grid-3">
            {specialists.map((s) => (
              <div key={s.id} className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ color: '#38bdf8', fontSize: '1.1rem' }}>{s.name}</h4>
                <div style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600 }}>{s.specialty}</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                  ⏰ Schedule: <b>{s.timing}</b>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <span className={`status-badge ${s.status === 'Available' ? 'status-accepted' : 'status-pending'}`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: FACILITY AMBULANCES */}
      {activeTab === 'AMBULANCES' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem' }}>Facility Ambulances Fleet & Real-Time Availability</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Manage emergency response units attached to {summary?.hospital?.name || 'this hospital'}
              </p>
            </div>
          </div>

          {ambulances.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Truck size={40} color="#64748b" style={{ margin: '0 auto 0.75rem' }} />
              <h4>No ambulances assigned to this hospital</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Register ambulances via the administrative console to associate them with this facility.
              </p>
            </div>
          ) : (
            <div className="grid-2">
              {ambulances.map((amb) => (
                <div key={amb.id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Truck size={20} color="#fbbf24" />
                        <h4 style={{ color: '#f8fafc', fontSize: '1.15rem' }}>{amb.vehicleNumber || amb.vehicleNo}</h4>
                      </div>
                      <div style={{ color: '#a78bfa', fontSize: '0.85rem', marginTop: '2px' }}>
                        {amb.type || 'Advanced Life Support (ALS)'}
                      </div>
                    </div>
                    <span
                      className={`status-badge ${
                        amb.status === 'AVAILABLE' ? 'status-accepted' : amb.status === 'ON_DUTY' ? 'status-scheduled' : 'status-cancelled'
                      }`}
                    >
                      {amb.status}
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    <div>👤 <strong>Driver:</strong> {amb.driverName}</div>
                    <div style={{ marginTop: '4px' }}>📞 <strong>Contact:</strong> {amb.phone || amb.driverPhone}</div>
                    <div style={{ marginTop: '4px' }}>📍 <strong>Live GPS:</strong> {(amb.latitude || amb.currentLocation?.lat)?.toFixed(4)}, {(amb.longitude || amb.currentLocation?.lng)?.toFixed(4)}</div>
                    <div style={{ marginTop: '4px', color: '#94a3b8' }}>🏢 <strong>Base Hub:</strong> {amb.currentLocation?.address || amb.hospitalName}</div>
                  </div>

                  {amb.equipment && amb.equipment.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Equipped With:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {amb.equipment.map((eq, i) => (
                          <span key={i} style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Set Availability:</span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {['AVAILABLE', 'ON_DUTY', 'OFFLINE'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleAmbulanceStatusChange(amb.id, st)}
                          className={`btn btn-sm ${amb.status === st ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={22} color="#ef4444" />
              <h3 style={{ fontSize: '1.2rem', color: '#ef4444' }}>Reject Inbound Request #{rejectTargetReqId}</h3>
            </div>

            <form onSubmit={handleConfirmReject}>
              <div className="form-group">
                <label className="form-label">Mandatory Rejection Reason (responseNotes):</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="e.g. ICU bed capacity at 100%; Ventilator equipment under maintenance."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectLoading}
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                >
                  {rejectLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SPECIALIST MODAL */}
      {showSpecialistModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Add Hospital Specialist</h3>
              <button onClick={() => setShowSpecialistModal(false)} className="btn btn-secondary btn-icon">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSpecialist}>
              <div className="form-group">
                <label className="form-label">Doctor / Specialist Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Dr. Anand Sharma"
                  value={specName}
                  onChange={(e) => setSpecName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department / Specialty</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Cardiology, Critical Care, Trauma"
                  value={specSpecialty}
                  onChange={(e) => setSpecSpecialty(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">OPD Timings</label>
                <input
                  type="text"
                  className="form-control"
                  value={specTiming}
                  onChange={(e) => setSpecTiming(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSpecialistModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Specialist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
