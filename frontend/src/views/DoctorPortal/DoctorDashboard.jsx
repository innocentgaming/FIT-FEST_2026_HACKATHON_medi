import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { ErrorMessage } from '../../components/ErrorMessage';
import {
  Stethoscope,
  CheckCircle,
  AlertTriangle,
  Building2,
  FileCheck,
  Send,
  ArrowRight,
  ShieldCheck,
  Activity,
  History,
  Clock,
  UserCheck,
  XCircle
} from 'lucide-react';

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const { liveRequestUpdate } = useSocket();

  // Tabs: DASHBOARD, ASSIGNED_CONFLICTS, RESOLUTION_HISTORY
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [assignedRequests, setAssignedRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Resolution Modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [targetRequest, setTargetRequest] = useState(null);
  const [alternativeHospitalId, setAlternativeHospitalId] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvingLoading, setResolvingLoading] = useState(false);

  useEffect(() => {
    loadDoctorData();
  }, []);

  useEffect(() => {
    if (liveRequestUpdate) {
      loadDoctorData();
    }
  }, [liveRequestUpdate]);

  const loadDoctorData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [docRes, hospsRes] = await Promise.all([
        api.getDoctorAssignedRequests(),
        api.getHospitals()
      ]);

      setAssignedRequests(docRes.requests || []);
      setHospitals(hospsRes.hospitals || []);

      if (hospsRes.hospitals?.length > 0 && !alternativeHospitalId) {
        setAlternativeHospitalId(hospsRes.hospitals[0].id);
      }
    } catch (err) {
      console.error('Error loading doctor data:', err);
      setErrorMessage('Failed to synchronize doctor triage caseload. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResolveModal = (req) => {
    setTargetRequest(req);
    const otherHosp = hospitals.find((h) => h.id !== req.targetHospitalId) || hospitals[0];
    setAlternativeHospitalId(otherHosp ? otherHosp.id : '');
    setResolutionNotes(`Reviewed rejection reason. Re-routing patient to ${otherHosp?.name || 'alternative facility'} where ICU/oxygen resources are verified available.`);
    setResolveModalOpen(true);
  };

  const handleConfirmResolve = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      alert('Comprehensive resolution notes are required to resolve the conflict.');
      return;
    }
    setResolvingLoading(true);
    try {
      await api.resolveDoctorConflict(targetRequest.id, {
        alternativeHospitalId,
        resolutionNotes
      });
      setResolveModalOpen(false);
      loadDoctorData();
    } catch (err) {
      alert('Error resolving conflict: ' + err.message);
    } finally {
      setResolvingLoading(false);
    }
  };

  const pendingEscalations = assignedRequests.filter((r) => r.status === 'ASSIGNED' || r.status === 'REJECTED');
  const resolvedEscalations = assignedRequests.filter((r) => r.status === 'RESOLVED');

  return (
    <div className="doctor-portal-view">
      {/* Doctor Header */}
      <section
        className="card"
        style={{
          background: 'linear-gradient(135deg, #111927 0%, #4a044e 100%)',
          border: '1px solid rgba(236, 72, 153, 0.3)',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
        aria-label="Doctor Conflict Resolution Header"
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="role-pill role-system_doctor">SYSTEM DOCTOR CONFLICT RESOLUTION</span>
            <span style={{ color: '#fbcfe8', fontSize: '0.8rem' }}>Emergency Triage Specialist</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.35rem', color: '#f8fafc' }}>
            {user?.name}
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>
            Authority to override rejections, reallocate hospital resources, and guarantee terminal resolution.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#fbcfe8' }}>Pending Escalations</div>
            <strong style={{ fontSize: '1.4rem', color: '#f8fafc' }}>{pendingEscalations.length}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#fbcfe8' }}>Resolved Cases</div>
            <strong style={{ fontSize: '1.4rem', color: '#f8fafc' }}>{resolvedEscalations.length}</strong>
          </div>
        </div>
      </section>

      {/* Tabs Navigation (Doctor: Dashboard, Assigned Conflicts, Resolution History) */}
      <nav className="tabs-nav" aria-label="Doctor Navigation">
        <button
          className={`tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
          onClick={() => setActiveTab('DASHBOARD')}
        >
          <Activity size={16} aria-hidden="true" /> Dashboard
        </button>

        <button
          className={`tab-btn ${activeTab === 'ASSIGNED_CONFLICTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('ASSIGNED_CONFLICTS')}
        >
          <AlertTriangle size={16} aria-hidden="true" /> Assigned Conflicts ({pendingEscalations.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'RESOLUTION_HISTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('RESOLUTION_HISTORY')}
        >
          <History size={16} aria-hidden="true" /> Resolution History ({resolvedEscalations.length})
        </button>
      </nav>

      {errorMessage && <ErrorMessage message={errorMessage} onRetry={loadDoctorData} />}

      {loading ? (
        <LoadingSpinner text="Loading assigned conflict triage records..." />
      ) : (
        <>
          {/* TAB 1: DASHBOARD (Overview & Caseload Summary) */}
          {activeTab === 'DASHBOARD' && (
            <div className="tab-pane">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ background: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#fbcfe8', fontWeight: 600 }}>🚨 Pending Action</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f43f5e', marginTop: '4px' }}>
                    {pendingEscalations.length} Cases
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                    Escalated rejections awaiting alternative facility routing
                  </p>
                </div>

                <div className="card" style={{ background: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>✅ Resolved & Terminal</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                    {resolvedEscalations.length} Cases
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                    Successfully coordinated alternative facility admissions
                  </p>
                </div>

                <div className="card" style={{ background: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>🏥 Network Destination Facilities</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                    {hospitals.length} Facilities
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                    Available for alternative hospital re-routing
                  </p>
                </div>
              </div>

              {/* Priority Assigned Conflicts Section */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <div className="card-title">
                    <AlertTriangle size={20} color="#f472b6" />
                    <span>Priority Conflicts Requiring Resolution</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('ASSIGNED_CONFLICTS')}
                    className="btn btn-secondary btn-sm"
                  >
                    View All
                  </button>
                </div>

                {pendingEscalations.length === 0 ? (
                  <EmptyState
                    icon={ShieldCheck}
                    title="Zero Pending Escalations"
                    description="You currently have no unfulfilled rejected requests assigned to your caseload."
                  />
                ) : (
                  <div className="table-responsive" style={{ padding: 0 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Request</th>
                          <th>Patient Info</th>
                          <th>Target Hospital</th>
                          <th>Rejection Reason</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingEscalations.slice(0, 3).map((req) => (
                          <tr key={req.id}>
                            <td>
                              <strong style={{ color: '#38bdf8' }}>#{req.id}</strong>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{req.type}</div>
                            </td>
                            <td>
                              <div>{req.patientName}</div>
                              <small style={{ color: '#94a3b8' }}>{req.patientPhone}</small>
                            </td>
                            <td>{req.targetHospitalName}</td>
                            <td style={{ color: '#fca5a5', maxWidth: '280px' }}>
                              "{req.responseNotes || 'No specific note provided'}"
                            </td>
                            <td>
                              <StatusBadge status={req.status} />
                            </td>
                            <td>
                              <button
                                onClick={() => handleOpenResolveModal(req)}
                                className="btn btn-primary btn-sm"
                                style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}
                              >
                                Resolve & Re-route
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ASSIGNED CONFLICTS */}
          {activeTab === 'ASSIGNED_CONFLICTS' && (
            <div className="tab-pane">
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                  Assigned Emergency Conflicts Queue
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  These requests were rejected by target hospitals and assigned to you by State Health Command for conflict resolution.
                </p>
              </div>

              {pendingEscalations.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="No Assigned Conflicts"
                  description="All escalated requests in your queue have been resolved."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  {pendingEscalations.map((req) => (
                    <div key={req.id} className="card" style={{ border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#f472b6', fontWeight: 700 }}>#{req.id} • {req.type}</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>{req.patientName}</h4>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Phone: {req.patientPhone}</span>
                        </div>
                        <StatusBadge status={req.status} />
                      </div>

                      <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.75rem', borderRadius: '6px', margin: '0.75rem 0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 600 }}>Original Target: {req.targetHospitalName}</div>
                        <div style={{ fontSize: '0.82rem', color: '#fecaca', marginTop: '0.2rem' }}>
                          <strong>Rejection Reason:</strong> "{req.responseNotes || 'No specific note'}"
                        </div>
                      </div>

                      {req.triageNotes && (
                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', background: 'var(--bg-input)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                          Admin Triage Note: {req.triageNotes}
                        </div>
                      )}

                      <button
                        onClick={() => handleOpenResolveModal(req)}
                        className="btn btn-primary"
                        style={{ width: '100%', background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}
                      >
                        Select Alternative & Resolve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESOLUTION HISTORY */}
          {activeTab === 'RESOLUTION_HISTORY' && (
            <div className="tab-pane">
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                  Doctor Resolution History & Audit Archive
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Immutable log of all resolved hospital conflicts and re-routed admissions.
                </p>
              </div>

              {resolvedEscalations.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No Resolved Cases Yet"
                  description="Cases you resolve will be archived here with full administrative audit notes."
                />
              ) : (
                <div className="table-responsive card" style={{ padding: 0 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Request ID</th>
                        <th>Patient</th>
                        <th>Re-Allocated Facility</th>
                        <th>Doctor Resolution Notes</th>
                        <th>Status</th>
                        <th>Resolved At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedEscalations.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>#{r.id}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{r.type}</div>
                          </td>
                          <td>
                            <div>{r.patientName}</div>
                            <small style={{ color: '#94a3b8' }}>{r.patientPhone}</small>
                          </td>
                          <td style={{ color: '#38bdf8', fontWeight: 600 }}>
                            {r.targetHospitalName || r.reallocatedFacility}
                          </td>
                          <td style={{ color: '#34d399', fontSize: '0.85rem', maxWidth: '350px' }}>
                            "{r.resolutionNotes || 'Alternative facility coordinated.'}"
                          </td>
                          <td>
                            <StatusBadge status={r.status} />
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {new Date(r.resolvedAt || r.updatedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Resolution Modal */}
      {resolveModalOpen && targetRequest && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                Resolve Healthcare Conflict: #{targetRequest.id}
              </h3>
              <button onClick={() => setResolveModalOpen(false)} className="btn btn-secondary btn-icon" aria-label="Close">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmResolve}>
              <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div>Patient: <strong>{targetRequest.patientName}</strong></div>
                <div>Original Rejection: <span style={{ color: '#fca5a5' }}>"{targetRequest.responseNotes || 'Beds full'}"</span></div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Select Alternative Facility:
                </label>
                <select
                  className="form-control"
                  value={alternativeHospitalId}
                  onChange={(e) => setAlternativeHospitalId(e.target.value)}
                  required
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (ICU: {h.resources?.icuBedsAvailable || 0}, Beds: {h.resources?.generalBedsAvailable || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Administrative Resolution Notes (Non-Diagnostic):
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  required
                  placeholder="Explain coordination action: Alternative facility contacted, bed inventory verified, ambulance transit arranged..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setResolveModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  disabled={resolvingLoading}
                >
                  {resolvingLoading ? 'Resolving...' : 'Confirm Resolution (Terminal)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
