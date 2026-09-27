import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { LiveMap } from '../../components/LiveMap';
import {
  ShieldAlert,
  Building2,
  Truck,
  AlertTriangle,
  UserCheck,
  RotateCcw,
  Stethoscope,
  Activity,
  FileText,
  CheckCircle,
  Eye,
  Send
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { liveRequestUpdate, liveResourceUpdate } = useSocket();

  const [activeTab, setActiveTab] = useState('TRIAGE'); // TRIAGE, HOSPITALS, AMBULANCES, AUDIT
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [systemDoctors, setSystemDoctors] = useState([]);
  const [adminRequests, setAdminRequests] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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
      loadAdminData();
    } catch (err) {
      alert('Error escalating request: ' + err.message);
    } finally {
      setEscalateLoading(false);
    }
  };

  const handleResetDemoState = async () => {
    if (window.confirm('Reset all databases, requests, and counters back to initial hackathon seeds?')) {
      try {
        await api.resetDemoData();
        alert('System state successfully restored to initial seed!');
        loadAdminData();
      } catch (err) {
        alert('Error resetting demo: ' + err.message);
      }
    }
  };

  const rejectedQueue = adminRequests?.unresolvedQueue || [];
  const allRequests = adminRequests?.allRequests || [];

  return (
    <div>
      {/* Admin Command Header */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #111927 0%, #311042 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
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
            <span className="role-pill role-admin">COMMAND ADMIN DASHBOARD</span>
            <span style={{ color: '#d8b4fe', fontSize: '0.8rem' }}>State Health Coordination Centre</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.35rem' }}>Macro Network Coordination Overview</h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>
            Live triage & macro surveillance for {hospitals.length} hospitals & {ambulances.length} active emergency units
          </p>
        </div>

        <button
          onClick={handleResetDemoState}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: 'rgba(255,255,255,0.2)' }}
          title="Reset database back to initial clean state"
        >
          <RotateCcw size={15} /> Reset Hackathon Demo Seed
        </button>
      </div>

      {/* Macro Metrics Bar */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', background: 'var(--bg-subtle)' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Total Healthcare Facilities</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {hospitals.length}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', background: 'var(--bg-subtle)' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Active Ambulance Fleet</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
            {ambulances.length}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', background: 'var(--bg-subtle)' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Total Network Requests</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a78bfa', marginTop: '4px' }}>
            {allRequests.length}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)'
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#fca5a5' }}>🚨 Unresolved / Rejected Queue</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
            {rejectedQueue.length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'TRIAGE' ? 'active' : ''}`}
          onClick={() => setActiveTab('TRIAGE')}
        >
          <AlertTriangle size={16} /> Escalation & Triage Queue ({rejectedQueue.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'HOSPITALS' ? 'active' : ''}`}
          onClick={() => setActiveTab('HOSPITALS')}
        >
          <Building2 size={16} /> Hospital Resource Surveillance
        </button>

        <button
          className={`tab-btn ${activeTab === 'AMBULANCES' ? 'active' : ''}`}
          onClick={() => setActiveTab('AMBULANCES')}
        >
          <Truck size={16} /> Ambulance Fleet & Map
        </button>

        <button
          className={`tab-btn ${activeTab === 'AUDIT' ? 'active' : ''}`}
          onClick={() => setActiveTab('AUDIT')}
        >
          <FileText size={16} /> Audit Log Stream ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: ESCALATION & TRIAGE QUEUE */}
      {activeTab === 'TRIAGE' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#f87171' }}>
              🚨 Unfulfilled & Rejected Emergency Escalation Queue
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              When a facility rejects an emergency request, MediLink routes it to this escalation desk. Admins can triage and assign it to a System Doctor for conflict resolution:
            </p>
          </div>

          {rejectedQueue.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
              <h4>Zero Unresolved Rejections in Queue</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                All emergency and admission requests across the network have been fulfilled or resolved.
              </p>
            </div>
          ) : (
            <div className="table-responsive card" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request ID & Type</th>
                    <th>Patient Name</th>
                    <th>Target Hospital</th>
                    <th>Rejection Reason (responseNotes)</th>
                    <th>Status</th>
                    <th>Escalation Action</th>
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
                        <small style={{ color: '#94a3b8' }}>{req.patientPhone}</small>
                      </td>
                      <td>{req.targetHospitalName}</td>
                      <td style={{ color: '#fca5a5', maxWidth: '300px' }}>
                        "{req.responseNotes || 'No specific note provided'}"
                      </td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenEscalateModal(req.id)}
                          className="btn btn-primary btn-sm"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
                        >
                          <Stethoscope size={14} /> Assign to System Doctor
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* All Network Requests Overview */}
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>All Network Requests Archive</h4>
            <div className="table-responsive card" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Patient</th>
                    <th>Target Facility</th>
                    <th>Assigned Doctor/Ambulance</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allRequests.slice(0, 10).map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{r.type}</td>
                      <td>{r.patientName}</td>
                      <td>{r.targetHospitalName || 'N/A'}</td>
                      <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                        {r.assignedDoctorName || r.assignedAmbulanceVehicle || 'Unassigned'}
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
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HOSPITAL RESOURCE SURVEILLANCE */}
      {activeTab === 'HOSPITALS' && (
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

      {/* TAB 3: AMBULANCE FLEET & MAP */}
      {activeTab === 'AMBULANCES' && (
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

      {/* TAB 4: AUDIT LOG STREAM */}
      {activeTab === 'AUDIT' && (
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
                    {log.details}
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
              <h3 style={{ fontSize: '1.2rem', color: '#f8fafc' }}>
                Escalate Request #{selectedRequestId} to System Doctor
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              System Doctors have authority to override rejections, evaluate alternative hospitals, and transition the request to <code>RESOLVED</code>.
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
                  {systemDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.specialty || 'Triage Specialist'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Triage & Escalation Notes:</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
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
                  disabled={escalateLoading}
                  className="btn btn-primary"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
                >
                  {escalateLoading ? 'Assigning...' : 'Assign Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
