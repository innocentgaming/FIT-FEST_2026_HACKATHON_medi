import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { LiveMap } from '../../components/LiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import {
  ShieldAlert,
  Building2,
  Truck,
  AlertTriangle,
  RotateCcw,
  Stethoscope,
  Activity,
  FileText,
  CheckCircle,
  Clock,
  Search,
  Filter,
  ArrowRight,
  Send,
  UserCheck
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { liveRequestUpdate, liveResourceUpdate } = useSocket();

  // Tabs: DASHBOARD, CONFLICTS, HOSPITALS, AMBULANCES, REQUESTS, AUDIT
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [systemDoctors, setSystemDoctors] = useState([]);
  const [adminRequests, setAdminRequests] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Requests Tab
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterHospital, setFilterHospital] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Escalation Modal
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [triageNotes, setTriageNotes] = useState('');
  const [escalateLoading, setEscalateLoading] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    if (liveRequestUpdate || liveResourceUpdate) {
      loadAdminData();
    }
  }, [liveRequestUpdate, liveResourceUpdate]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [hosps, ambs, docs, reqs, logs] = await Promise.all([
        api.getAdminHospitals(),
        api.getAmbulances(),
        api.getSystemDoctors(),
        api.getAdminRequests(),
        api.getAuditLogs(50)
      ]);

      setHospitals(hosps.hospitals || []);
      setAmbulances(ambs.ambulances || []);
      setSystemDoctors(docs.doctors || []);
      setAdminRequests(reqs);
      setAuditLogs(logs.logs || []);

      if (docs.doctors?.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docs.doctors[0].id);
      }
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEscalateModal = (reqId) => {
    setSelectedRequestId(reqId);
    setTriageNotes('Escalated by Admin for System Doctor conflict resolution & facility re-routing.');
    setEscalateModalOpen(true);
  };

  const handleConfirmEscalation = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      alert('Please select a System Doctor.');
      return;
    }
    setEscalateLoading(true);
    try {
      await api.assignRequestToDoctor(selectedRequestId, selectedDoctorId, triageNotes);
      setEscalateModalOpen(false);
      await loadAdminData();
      alert(`Request #${selectedRequestId} successfully assigned to System Doctor.`);
    } catch (err) {
      alert('Error escalating request: ' + err.message);
    } finally {
      setEscalateLoading(false);
    }
  };

  const handleResetDemoState = async () => {
    if (window.confirm('Reset all network databases, requests, and telemetry counters back to baseline catalog?')) {
      try {
        await api.resetDemoData();
        alert('System database state successfully synchronized to baseline!');
        loadAdminData();
      } catch (err) {
        alert('Error synchronizing database: ' + err.message);
      }
    }
  };

  const rejectedQueue = adminRequests?.unresolvedQueue || [];
  const allRequests = adminRequests?.allRequests || adminRequests?.requests || [];
  const inProgressEscalations = allRequests.filter((r) => r.status === 'ASSIGNED' && r.assignedDoctorId);
  const resolvedEscalations = allRequests.filter((r) => r.status === 'RESOLVED');

  const filteredAllRequests = allRequests.filter((r) => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (filterPriority !== 'ALL' && r.priority !== filterPriority) return false;
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    if (filterHospital !== 'ALL' && r.targetHospitalId !== filterHospital && r.targetHospitalName !== filterHospital) return false;
    if (filterDate && !(r.createdAt || '').startsWith(filterDate)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = String(r.id).toLowerCase().includes(q);
      const matchName = (r.patientName || '').toLowerCase().includes(q);
      const matchPhone = (r.patientPhone || '').toLowerCase().includes(q);
      const matchTarget = (r.targetHospitalName || '').toLowerCase().includes(q);
      if (!matchId && !matchName && !matchPhone && !matchTarget) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Admin Command Header */}
      <div className="portal-hero-card portal-hero-admin">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="role-pill role-admin">COMMAND ADMIN DASHBOARD</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>State Health Coordination Centre</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.35rem', color: 'var(--text-primary)' }}>Macro Network Coordination Overview</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Live triage & macro surveillance for {hospitals.length} hospitals & {ambulances.length} active emergency units
          </p>
        </div>

        <button
          onClick={handleResetDemoState}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          title="Reset database back to baseline clean state"
        >
          <RotateCcw size={15} /> Reset System State
        </button>
      </div>

      {/* Macro Metrics Bar - 7 Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem'
        }}
      >
        <div className="card" style={{ padding: '0.75rem', background: 'var(--bg-subtle)' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Total Hospitals</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
            {adminRequests?.summary?.totalHospitals || hospitals.length}
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', background: 'var(--bg-subtle)' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Active Ambulances</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
            {adminRequests?.summary?.activeAmbulances || ambulances.length}
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', background: 'var(--bg-subtle)' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Active Requests</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
            {adminRequests?.summary?.activeRequests || allRequests.filter((r) => ['PENDING', 'ASSIGNED', 'ACCEPTED'].includes(r.status)).length}
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', background: 'var(--bg-subtle)' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Pending Requests</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a78bfa', marginTop: '2px' }}>
            {adminRequests?.summary?.pendingRequests || allRequests.filter((r) => r.status === 'PENDING').length}
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveTab('CONFLICTS')}
          style={{
            padding: '0.75rem',
            background: rejectedQueue.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-subtle)',
            border: rejectedQueue.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-card)',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>Rejected (Conflicts)</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
            {rejectedQueue.length}
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveTab('CONFLICTS')}
          style={{
            padding: '0.75rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#fde68a' }}>In Doctor Triage</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
            {inProgressEscalations.length}
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', background: 'var(--bg-subtle)' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Emergency Requests</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f43f5e', marginTop: '2px' }}>
            {adminRequests?.summary?.emergencyRequests || allRequests.filter((r) => r.priority === 'EMERGENCY' || r.type === 'AMBULANCE').length}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="tabs-nav" aria-label="Admin Portal Navigation">
        <button
          className={`tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
          onClick={() => setActiveTab('DASHBOARD')}
        >
          <Activity size={16} aria-hidden="true" /> Dashboard
        </button>

        <button
          className={`tab-btn ${activeTab === 'CONFLICTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('CONFLICTS')}
          style={{ position: 'relative' }}
        >
          <AlertTriangle size={16} aria-hidden="true" /> Conflicts & Triage
          {rejectedQueue.length > 0 && (
            <span
              style={{
                marginLeft: '6px',
                background: '#ef4444',
                color: '#fff',
                padding: '2px 7px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}
            >
              {rejectedQueue.length}
            </span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'HOSPITALS' ? 'active' : ''}`}
          onClick={() => setActiveTab('HOSPITALS')}
        >
          <Building2 size={16} aria-hidden="true" /> Hospitals ({hospitals.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'AMBULANCES' ? 'active' : ''}`}
          onClick={() => setActiveTab('AMBULANCES')}
        >
          <Truck size={16} aria-hidden="true" /> Ambulances ({ambulances.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'REQUESTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('REQUESTS')}
        >
          <FileText size={16} aria-hidden="true" /> Requests ({allRequests.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'AUDIT' ? 'active' : ''}`}
          onClick={() => setActiveTab('AUDIT')}
        >
          <ShieldAlert size={16} aria-hidden="true" /> Audit Logs ({auditLogs.length})
        </button>
      </nav>

      {loading && <LoadingSpinner text="Synchronizing state coordination telemetry..." />}

      {/* TAB 1: DASHBOARD / OVERVIEW */}
      {!loading && activeTab === 'DASHBOARD' && (
        <div className="tab-pane">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Priority Triage Escalation Card */}
            <div className="card" style={{ border: rejectedQueue.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  <span>Unresolved Conflicts ({rejectedQueue.length})</span>
                </h3>
                <button
                  onClick={() => setActiveTab('CONFLICTS')}
                  className="btn btn-danger btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                >
                  Manage Conflicts
                </button>
              </div>

              {rejectedQueue.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  <CheckCircle size={28} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                  <p>All network emergency requests fulfilled or assigned.</p>
                </div>
              ) : (
                rejectedQueue.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#f87171' }}>#{req.id} • {req.type}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                        {req.patientName} &rarr; <span style={{ color: '#94a3b8' }}>Rejected by {req.targetHospitalName}</span>
                      </div>
                      {req.responseNotes && (
                        <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '2px' }}>
                          Reason: "{req.responseNotes}"
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenEscalateModal(req.id)}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
                    >
                      Assign Doctor
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Network Capacity Telemetry Card */}
            <div className="card" style={{ border: '1px solid var(--border-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={18} color="#38bdf8" />
                  <span>Network Capacity Telemetry</span>
                </h3>
                <button
                  onClick={() => setActiveTab('HOSPITALS')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                >
                  Manage Facilities
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Network Total Beds</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                    {hospitals.reduce((acc, h) => acc + (h.resources?.generalBedsAvailable || 0), 0)} Available
                  </div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Critical ICU Units</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>
                    {hospitals.reduce((acc, h) => acc + (h.resources?.icuBedsAvailable || 0), 0)} Available
                  </div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ventilators</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a78bfa' }}>
                    {hospitals.reduce((acc, h) => acc + (h.resources?.ventilatorsAvailable || 0), 0)} Ready
                  </div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Oxygen Cylinders</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                    {hospitals.reduce((acc, h) => acc + (h.resources?.oxygenCylindersAvailable || 0), 0)} Units
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Map & Ambulance Surveillance */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Truck size={18} color="#fbbf24" />
                <span>Live Ambulance Fleet Surveillance</span>
              </div>
              <button onClick={() => setActiveTab('AMBULANCES')} className="btn btn-secondary btn-sm">
                Full Map View
              </button>
            </div>
            <LiveMap hospitals={hospitals} ambulances={ambulances} height="280px" />
          </div>
        </div>
      )}

      {/* TAB 2: CONFLICTS / ESCALATION QUEUE */}
      {!loading && activeTab === 'CONFLICTS' && (
        <div className="tab-pane">
          {/* Header Description */}
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <AlertTriangle size={20} color="#f87171" />
              <h3 style={{ fontSize: '1.15rem', color: '#f87171', margin: 0 }}>
                🚨 Unfulfilled & Rejected Emergency Escalation Desk
              </h3>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
              When a hospital rejects a critical emergency or admission request due to bed or equipment constraints, MediLink automatically routes it here. Admins assign the case to a <strong>System Doctor</strong> who possesses administrative override authority to allocate alternative hospitals and resolve the bottleneck.
            </p>
          </div>

          {/* Section 1: Unresolved Rejections Queue */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div className="card-title">
                <ShieldAlert size={20} color="#ef4444" />
                <span>Pending Escalation Queue ({rejectedQueue.length})</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Awaiting Doctor Assignment
              </span>
            </div>

            {rejectedQueue.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="Zero Unresolved Rejections in Queue"
                description="All emergency and admission requests across the hospital network have been fulfilled or resolved."
              />
            ) : (
              <div className="table-responsive" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request ID & Type</th>
                      <th>Patient Name</th>
                      <th>Target Facility</th>
                      <th>Rejection Reason</th>
                      <th>Status</th>
                      <th>Triage Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejectedQueue.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <strong style={{ color: '#38bdf8' }}>#{req.id}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Type: {req.type}</div>
                        </td>
                        <td>
                          <div>{req.patientName}</div>
                          <small style={{ color: '#94a3b8' }}>📞 {req.patientPhone}</small>
                        </td>
                        <td>
                          <strong style={{ color: '#f8fafc' }}>{req.targetHospitalName}</strong>
                        </td>
                        <td style={{ color: '#fca5a5', maxWidth: '280px' }}>
                          <em>"{req.responseNotes || 'No specific note provided'}"</em>
                        </td>
                        <td>
                          <StatusBadge status={req.status} />
                        </td>
                        <td>
                          <button
                            onClick={() => handleOpenEscalateModal(req.id)}
                            className="btn btn-primary btn-sm"
                            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Stethoscope size={14} /> Assign to Doctor
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Cases In-Progress with System Doctors */}
          {inProgressEscalations.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div className="card-header">
                <div className="card-title">
                  <UserCheck size={20} color="#fbbf24" />
                  <span>Assigned & Under System Doctor Resolution ({inProgressEscalations.length})</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                  Doctor Triage Active
                </span>
              </div>

              <div className="table-responsive" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request</th>
                      <th>Patient</th>
                      <th>Assigned System Doctor</th>
                      <th>Triage Notes</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inProgressEscalations.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <strong style={{ color: '#38bdf8' }}>#{req.id}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{req.type}</div>
                        </td>
                        <td>
                          <div>{req.patientName}</div>
                          <small style={{ color: '#94a3b8' }}>{req.patientPhone}</small>
                        </td>
                        <td>
                          <div style={{ color: '#a78bfa', fontWeight: 700 }}>
                            👨‍⚕️ {req.assignedDoctorName || 'System Doctor'}
                          </div>
                          <small style={{ color: '#94a3b8' }}>
                            Assigned: {req.assignedAt ? new Date(req.assignedAt).toLocaleTimeString() : 'Recently'}
                          </small>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#cbd5e1', maxWidth: '300px' }}>
                          {req.triageNotes || 'Priority triage under review.'}
                        </td>
                        <td>
                          <StatusBadge status={req.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: Resolved Conflict Archive */}
          {resolvedEscalations.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <CheckCircle size={20} color="#10b981" />
                  <span>Resolved Conflict Log ({resolvedEscalations.length})</span>
                </div>
              </div>

              <div className="table-responsive" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request</th>
                      <th>Patient</th>
                      <th>Resolution Facility / Notes</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedEscalations.slice(0, 5).map((req) => (
                      <tr key={req.id}>
                        <td>
                          <strong style={{ color: '#38bdf8' }}>#{req.id}</strong>
                        </td>
                        <td>{req.patientName}</td>
                        <td style={{ fontSize: '0.82rem', color: '#86efac' }}>
                          {req.resolutionNotes || 'Successfully re-routed and resolved by System Doctor.'}
                        </td>
                        <td>
                          <StatusBadge status={req.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HOSPITAL RESOURCE SURVEILLANCE */}
      {!loading && activeTab === 'HOSPITALS' && (
        <div className="table-responsive card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Hospital Name</th>
                <th>Area / City</th>
                <th>General Beds</th>
                <th>ICU Beds</th>
                <th>Ventilators</th>
                <th>Oxygen Cylinders</th>
                <th>Helpline</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((h) => (
                <tr key={h.id}>
                  <td>
                    <strong>{h.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {h.id}</div>
                  </td>
                  <td>{h.area}, {h.city}</td>
                  <td>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                      {h.resources?.generalBedsAvailable}/{h.resources?.generalBedsTotal}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#ef4444', fontWeight: 800 }}>
                      {h.resources?.icuBedsAvailable}/{h.resources?.icuBedsTotal}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>
                      {h.resources?.ventilatorsAvailable}/{h.resources?.ventilatorsTotal}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>
                      {h.resources?.oxygenCylindersAvailable}/{h.resources?.oxygenCylindersTotal}
                    </span>
                  </td>
                  <td>📞 {h.emergencyHelpline || h.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: AMBULANCE FLEET & MAP */}
      {!loading && activeTab === 'AMBULANCES' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <LiveMap hospitals={hospitals} ambulances={ambulances} height="360px" />
          </div>

          <div className="table-responsive card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle No</th>
                  <th>Driver Name & Phone</th>
                  <th>Hospital Base</th>
                  <th>Equipment Type</th>
                  <th>Status</th>
                  <th>GPS Telemetry</th>
                </tr>
              </thead>
              <tbody>
                {ambulances.map((amb) => (
                  <tr key={amb.id}>
                    <td>
                      <strong style={{ color: '#fbbf24' }}>{amb.vehicleNo}</strong>
                    </td>
                    <td>
                      <div>{amb.driverName}</div>
                      <small style={{ color: '#94a3b8' }}>{amb.driverPhone}</small>
                    </td>
                    <td>{amb.hospitalName || 'Regional Dispatch'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{amb.type}</td>
                    <td>
                      <span className={`status-badge ${amb.status === 'Available' ? 'status-accepted' : 'status-pending'}`}>
                        {amb.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      📍 {amb.currentLocation?.lat?.toFixed(4)}, {amb.currentLocation?.lng?.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ALL REQUESTS ARCHIVE WITH FILTERS */}
      {!loading && activeTab === 'REQUESTS' && (
        <div className="tab-pane">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, color: '#f8fafc' }}>
              All Network Requests Archive
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Showing {filteredAllRequests.length} of {allRequests.length} total records
            </span>
          </div>

          {/* Network Table Filters */}
          <div
            style={{
              background: 'var(--bg-input)',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-card)',
              marginBottom: '1rem',
              display: 'flex',
              gap: '0.65rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}
          >
            {/* Search query */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 200px' }}>
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                className="form-control"
                placeholder="Search patient, ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Status:</span>
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Priority:</span>
              <select
                className="form-select"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto' }}
              >
                <option value="ALL">All Priorities</option>
                <option value="NORMAL">NORMAL</option>
                <option value="URGENT">URGENT</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="EMERGENCY">EMERGENCY</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Type:</span>
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto' }}
              >
                <option value="ALL">All Types</option>
                <option value="AMBULANCE">AMBULANCE</option>
                <option value="ADMISSION">ADMISSION</option>
                <option value="H2H_TRANSFER">H2H TRANSFER</option>
                <option value="BLOOD">BLOOD</option>
                <option value="EQUIPMENT">EQUIPMENT</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Hospital:</span>
              <select
                className="form-select"
                value={filterHospital}
                onChange={(e) => setFilterHospital(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto' }}
              >
                <option value="ALL">All Hospitals</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Date:</span>
              <input
                type="date"
                className="form-control"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', width: 'auto' }}
              />
            </div>

            {(filterStatus !== 'ALL' || filterPriority !== 'ALL' || filterType !== 'ALL' || filterHospital !== 'ALL' || filterDate || searchQuery) && (
              <button
                onClick={() => {
                  setFilterStatus('ALL');
                  setFilterPriority('ALL');
                  setFilterType('ALL');
                  setFilterHospital('ALL');
                  setFilterDate('');
                  setSearchQuery('');
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="table-responsive card" style={{ padding: 0 }}>
            {filteredAllRequests.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No matching requests found"
                description="Try adjusting your filter criteria or search query."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Patient</th>
                    <th>Target Facility</th>
                    <th>Priority</th>
                    <th>Assigned Resource</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllRequests.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>
                        <strong>{r.type}</strong>
                      </td>
                      <td>
                        <div>{r.patientName}</div>
                        <small style={{ color: '#94a3b8' }}>{r.patientPhone}</small>
                      </td>
                      <td>{r.targetHospitalName || 'N/A'}</td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '0.75rem', color: r.priority === 'EMERGENCY' || r.priority === 'CRITICAL' ? '#ef4444' : '#f59e0b' }}>
                          {r.priority}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                        {r.assignedDoctorName ? `👨‍⚕️ ${r.assignedDoctorName}` : r.assignedAmbulanceVehicle || 'Unassigned'}
                      </td>
                      <td>
                        <StatusBadge status={r.status} tripStatus={r.ambulanceTripStatus} />
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOG STREAM */}
      {!loading && activeTab === 'AUDIT' && (
        <div className="table-responsive card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Target Resource</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td><strong>{log.actorName}</strong></td>
                  <td>
                    <span className={`role-pill role-${(log.actorRole || '').toLowerCase()}`}>
                      {log.actorRole}
                    </span>
                  </td>
                  <td><code style={{ color: '#38bdf8' }}>{log.action}</code></td>
                  <td>{log.resourceType} (#{log.resourceId})</td>
                  <td style={{ fontSize: '0.82rem', color: '#cbd5e1', maxWidth: '320px' }}>
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ESCALATION MODAL (Assign to System Doctor) */}
      {escalateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Stethoscope size={22} color="#a78bfa" />
              <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: 0 }}>
                Escalate Request #{selectedRequestId} to System Doctor
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              System Doctors possess administrative authority to override hospital rejections, evaluate alternative facilities, and transition the request to <code>RESOLVED</code>.
            </p>

            <form onSubmit={handleConfirmEscalation}>
              <div className="form-group">
                <label className="form-label">Assign to System Doctor:</label>
                <select
                  className="form-select"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  required
                >
                  {systemDoctors.length === 0 ? (
                    <option value="">No System Doctors registered</option>
                  ) : (
                    systemDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.specialty || 'Triage Specialist'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Triage & Escalation Notes:</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder="Provide context on why this case is escalated and alternative resources to prioritize..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEscalateModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={escalateLoading || systemDoctors.length === 0}
                  className="btn btn-primary"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
                >
                  {escalateLoading ? 'Assigning...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
