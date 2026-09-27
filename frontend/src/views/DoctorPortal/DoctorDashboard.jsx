import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Stethoscope,
  CheckCircle,
  AlertTriangle,
  Building2,
  FileCheck,
  Send,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const { liveRequestUpdate } = useSocket();

  const [assignedRequests, setAssignedRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResolveModal = (req) => {
    setTargetRequest(req);
    // Pick first other hospital as default alternative
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
    <div>
      {/* Doctor Header */}
      <div
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
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="role-pill role-system_doctor">SYSTEM DOCTOR CONFLICT RESOLUTION</span>
            <span style={{ color: '#fbcfe8', fontSize: '0.8rem' }}>Emergency Triage Specialist</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.35rem' }}>
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
      </div>

      {/* Escalated Conflicts Queue */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">
            <AlertTriangle size={20} color="#f472b6" />
            <span>Assigned Emergency Conflicts & Escalations Queue</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{pendingEscalations.length} Cases Requiring Doctor Override</span>
        </div>

        {pendingEscalations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <ShieldCheck size={36} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
            <h4>No Unresolved Conflicts Assigned</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              All escalated hospital rejections and emergency transfer conflicts have been resolved.
            </p>
          </div>
        ) : (
          <div className="grid-2">
            {pendingEscalations.map((req) => (
              <div
                key={req.id}
                className="card"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid rgba(236, 72, 153, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <StatusBadge status={req.status} />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>#{req.id}</span>
                  </div>

                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                    Patient: {req.patientName} ({req.patientPhone})
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#38bdf8', marginTop: '2px' }}>
                    Type: <strong>{req.type}</strong> ({req.details?.bedType || 'General'} Requirement)
                  </div>

                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 700 }}>
                      Initial Hospital Rejection ({req.targetHospitalName}):
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '2px' }}>
                      "{req.responseNotes || 'No specific reason given'}"
                    </div>
                  </div>

                  {req.triageNotes && (
                    <div style={{ fontSize: '0.8rem', color: '#d8b4fe', marginTop: '0.5rem' }}>
                      Admin Triage Note: {req.triageNotes}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <button
                    onClick={() => handleOpenResolveModal(req)}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'
                    }}
                  >
                    <FileCheck size={16} /> Resolve Conflict & Re-Route Facility
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved History */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <CheckCircle size={18} color="#10b981" />
            <span>Doctor Resolution History (Terminal Status RESOLVED)</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{resolvedEscalations.length} Resolved</span>
        </div>

        <div className="table-responsive" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Patient</th>
                <th>Reallocated Facility</th>
                <th>Doctor Resolution Notes</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {resolvedEscalations.map((r) => (
                <tr key={r.id}>
                  <td><strong>#{r.id}</strong></td>
                  <td>{r.patientName}</td>
                  <td style={{ color: '#38bdf8', fontWeight: 600 }}>
                    {r.targetHospitalName}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#cbd5e1', maxWidth: '360px' }}>
                    {r.resolutionNotes}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {r.resolvedAt ? new Date(r.resolvedAt).toLocaleTimeString() : 'Resolved'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESOLUTION MODAL */}
      {resolveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Stethoscope size={22} color="#ec4899" />
              <h3 style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Resolve Conflict for Request #{targetRequest?.id}
              </h3>
            </div>

            <form onSubmit={handleConfirmResolve}>
              <div className="form-group">
                <label className="form-label">Re-Route & Allocate to Alternative Facility:</label>
                <select
                  className="form-select"
                  value={alternativeHospitalId}
                  onChange={(e) => setAlternativeHospitalId(e.target.value)}
                  required
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.resources?.icuBedsAvailable || 0} ICU beds, {h.resources?.generalBedsAvailable || 0} Gen beds)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mandatory Doctor Resolution & Override Notes:</label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Document alternative facility confirmation, bed reservation, and clinical triage coordination details..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolvingLoading}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  }}
                >
                  {resolvingLoading ? 'Resolving...' : 'Confirm & Mark RESOLVED'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
