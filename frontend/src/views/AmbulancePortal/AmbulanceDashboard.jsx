import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { LiveMap } from '../../components/LiveMap';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { ErrorMessage } from '../../components/ErrorMessage';
import {
  Truck,
  MapPin,
  Navigation,
  CheckCircle2,
  XCircle,
  Radio,
  Phone,
  Clock,
  Shield,
  AlertCircle,
  Play,
  Square,
  Activity,
  User,
  FileText
} from 'lucide-react';

export const AmbulanceDashboard = () => {
  const { user } = useAuth();
  const { liveRequestUpdate, socket } = useSocket();

  // Tabs: DASHBOARD, REQUESTS, LOCATION, PROFILE
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [ambulance, setAmbulance] = useState(null);
  const [assignedRequest, setAssignedRequest] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const sharingIntervalRef = useRef(null);
  const ambulanceId = user?.ambulanceId || 'amb_pune_101';

  useEffect(() => {
    loadAmbulanceData();
    return () => {
      if (sharingIntervalRef.current) clearInterval(sharingIntervalRef.current);
    };
  }, [ambulanceId]);

  useEffect(() => {
    if (liveRequestUpdate) {
      loadAmbulanceData();
    }
  }, [liveRequestUpdate]);

  const loadAmbulanceData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [ambRes, reqsRes, hospsRes] = await Promise.all([
        api.getAmbulances(),
        api.getRequests(),
        api.getHospitals()
      ]);

      const foundAmb = (ambRes.ambulances || []).find((a) => a.id === ambulanceId) || ambRes.ambulances?.[0];
      setAmbulance(foundAmb);
      setHospitals(hospsRes.hospitals || []);

      const reqs = reqsRes.requests || [];
      setAllRequests(reqs);

      // Find active request for this ambulance
      const active = reqs.find(
        (r) =>
          r.assignedAmbulanceId === (foundAmb ? foundAmb.id : ambulanceId) &&
          ['ASSIGNED', 'ACCEPTED', 'PENDING'].includes(r.status)
      );
      setAssignedRequest(active || null);
    } catch (err) {
      console.error('Error loading ambulance driver portal:', err);
      setErrorMessage('Failed to load fleet telemetry. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (newStatus) => {
    if (!ambulance) return;
    try {
      const res = await api.updateAmbulanceStatus(ambulance.id, newStatus);
      setAmbulance(res.ambulance);
    } catch (err) {
      alert('Error updating status: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAcceptTrip = async () => {
    if (!assignedRequest) return;
    try {
      await api.updateRequestStatus(assignedRequest.id, {
        status: 'ACCEPTED',
        ambulanceTripStatus: 'On the Way',
        responseNotes: `Driver ${user.name} accepted dispatch. En route to emergency scene.`
      });
      loadAmbulanceData();
    } catch (err) {
      alert('Error accepting trip: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRejectTrip = async (e) => {
    e.preventDefault();
    if (!assignedRequest) return;
    if (!rejectionReason.trim()) {
      alert('A rejection reason is strictly mandatory.');
      return;
    }

    try {
      setSubmittingReject(true);
      await api.updateRequestStatus(assignedRequest.id, {
        status: 'REJECTED',
        responseNotes: rejectionReason.trim(),
        reason: rejectionReason.trim()
      });
      setShowRejectModal(false);
      setRejectionReason('');
      loadAmbulanceData();
    } catch (err) {
      alert('Error rejecting trip: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleUpdateTripStep = async (stepName) => {
    if (!assignedRequest) return;
    try {
      if (stepName === 'Completed') {
        await api.updateRequestStatus(assignedRequest.id, {
          status: 'COMPLETED',
          ambulanceTripStatus: 'Completed',
          responseNotes: `Patient delivered safely to ${assignedRequest.targetHospitalName || 'Hospital ER'}. Trip completed.`
        });
      } else {
        await api.updateRequestStatus(assignedRequest.id, {
          ambulanceTripStatus: stepName,
          responseNotes: `Trip status updated to: ${stepName}`
        });
      }
      loadAmbulanceData();
    } catch (err) {
      alert('Error updating trip step: ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleLocationSharing = () => {
    if (isSharingLocation) {
      if (sharingIntervalRef.current) clearInterval(sharingIntervalRef.current);
      setIsSharingLocation(false);
    } else {
      setIsSharingLocation(true);
      sendLocationPulse();
      sharingIntervalRef.current = setInterval(() => {
        sendLocationPulse();
      }, 4000);
    }
  };

  const sendLocationPulse = async () => {
    if (!ambulance) return;
    const currentLat = ambulance.latitude || ambulance.currentLocation?.lat || 18.5204;
    const currentLng = ambulance.longitude || ambulance.currentLocation?.lng || 73.8567;

    const targetLat = 18.5314;
    const targetLng = 73.8765;
    const nextLat = currentLat + (targetLat - currentLat) * 0.15 + (Math.random() - 0.5) * 0.002;
    const nextLng = currentLng + (targetLng - currentLng) * 0.15 + (Math.random() - 0.5) * 0.002;

    try {
      const res = await api.updateAmbulanceLocation(ambulance.id, {
        lat: Number(nextLat.toFixed(5)),
        lng: Number(nextLng.toFixed(5)),
        speedKmph: Math.floor(35 + Math.random() * 20),
        heading: Math.floor(Math.random() * 360),
        address: 'Pune Emergency Transit Corridor (Live Simulated GPS Stream)'
      });
      setAmbulance(res.ambulance);
    } catch (err) {
      console.error('Error streaming simulated GPS:', err);
    }
  };

  return (
    <div className="ambulance-portal-view">
      {/* Driver Header */}
      <section
        className="card"
        style={{
          background: 'linear-gradient(135deg, #111927 0%, #78350f 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
        aria-label="Ambulance Fleet Status Header"
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="role-pill role-ambulance">AMBULANCE DRIVER PORTAL</span>
            <span style={{ color: '#fde68a', fontSize: '0.8rem' }}>Vehicle: {ambulance?.vehicleNumber || ambulance?.vehicleNo}</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.35rem', color: '#f8fafc' }}>
            {user?.name} (Driver ID: {user?.id})
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>
            Type: <strong>{ambulance?.type || 'ACLS Advanced Cardiac Unit'}</strong> • Base: {ambulance?.hospitalName}
          </p>
        </div>

        {/* Availability Switcher */}
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#fde68a', fontWeight: 600 }}>Duty Status:</span>
          {['AVAILABLE', 'ON_DUTY', 'OFFLINE'].map((st) => {
            const isActive = ambulance?.status?.toUpperCase() === st;
            return (
              <button
                key={st}
                onClick={() => handleStatusToggle(st)}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.6rem',
                  border: isActive ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {st.replace('_', ' ')}
              </button>
            );
          })}
        </div>
      </section>

      {/* Navigation Tabs (Ambulance: Dashboard, Requests, Location, Profile) */}
      <nav className="tabs-nav" aria-label="Ambulance Navigation">
        <button
          className={`tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
          onClick={() => setActiveTab('DASHBOARD')}
        >
          <Activity size={16} aria-hidden="true" /> Dashboard
        </button>

        <button
          className={`tab-btn ${activeTab === 'REQUESTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('REQUESTS')}
        >
          <FileText size={16} aria-hidden="true" /> Requests ({allRequests.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'LOCATION' ? 'active' : ''}`}
          onClick={() => setActiveTab('LOCATION')}
        >
          <Navigation size={16} aria-hidden="true" /> Location & GPS Telemetry
        </button>

        <button
          className={`tab-btn ${activeTab === 'PROFILE' ? 'active' : ''}`}
          onClick={() => setActiveTab('PROFILE')}
        >
          <User size={16} aria-hidden="true" /> Profile
        </button>
      </nav>

      {errorMessage && <ErrorMessage message={errorMessage} onRetry={loadAmbulanceData} />}

      {loading ? (
        <LoadingSpinner text="Synchronizing ambulance dispatch feed..." />
      ) : (
        <>
          {/* TAB 1: DASHBOARD (Active Assigned Dispatch & Live Fleet Stats) */}
          {activeTab === 'DASHBOARD' && (
            <div className="grid-2">
              {/* Left Column: Active Trip & Progression */}
              <div>
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <div className="card-header">
                    <div className="card-title">
                      <Truck size={20} color="#fbbf24" aria-hidden="true" />
                      <span>Active Assigned Emergency Dispatch</span>
                    </div>
                    {assignedRequest && (
                      <StatusBadge
                        status={assignedRequest.status}
                        tripStatus={assignedRequest.ambulanceTripStatus}
                      />
                    )}
                  </div>

                  {assignedRequest ? (
                    <div>
                      <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>#{assignedRequest.id}</span>
                          <span className="badge badge-danger">PRIORITY: {assignedRequest.priority}</span>
                        </div>

                        <div style={{ fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                          <strong>Patient:</strong> {assignedRequest.patientName || 'Emergency Patient'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                          <Phone size={13} style={{ display: 'inline', marginRight: '4px' }} />
                          {assignedRequest.patientPhone || 'Direct Dispatch'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                          <MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} />
                          Pickup: {assignedRequest.details?.location || 'Emergency Coordinates (Pune)'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#38bdf8', marginBottom: '0.35rem' }}>
                          Destination Facility: <strong>{assignedRequest.targetHospitalName || 'Apollo / Ruby Hall'}</strong>
                        </div>
                        {assignedRequest.details?.administrativeNote && (
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                            Intake Note: {assignedRequest.details.administrativeNote}
                          </div>
                        )}
                      </div>

                      {/* Acceptance Action Buttons if ASSIGNED */}
                      {assignedRequest.status === 'ASSIGNED' && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                          <button
                            onClick={handleAcceptTrip}
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '0.75rem' }}
                          >
                            <CheckCircle2 size={18} /> ACCEPT TRIP
                          </button>
                          <button
                            onClick={() => setShowRejectModal(true)}
                            className="btn btn-secondary"
                            style={{ borderColor: '#ef4444', color: '#ef4444' }}
                          >
                            <XCircle size={18} /> REJECT
                          </button>
                        </div>
                      )}

                      {/* Stepper Progression if ACCEPTED */}
                      {assignedRequest.status === 'ACCEPTED' && (
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                            Update Trip Progress:
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleUpdateTripStep('On the Way')}
                              className={`btn btn-sm ${assignedRequest.ambulanceTripStatus === 'On the Way' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                              1. On The Way
                            </button>
                            <button
                              onClick={() => handleUpdateTripStep('Arrived')}
                              className={`btn btn-sm ${assignedRequest.ambulanceTripStatus === 'Arrived' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                              2. Arrived
                            </button>
                            <button
                              onClick={() => handleUpdateTripStep('Completed')}
                              className="btn btn-sm btn-success"
                            >
                              3. Complete Trip
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Truck}
                      title="No Active Emergency Dispatches"
                      description="You are currently standing by on the network. Emergency dispatches will automatically appear here."
                    />
                  )}
                </div>

                {/* Simulated GPS Controls */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <Radio size={18} color="#38bdf8" />
                      <span>Live GPS Telemetry Simulation</span>
                    </div>
                    <span className={`status-badge ${isSharingLocation ? 'status-accepted' : 'status-pending'}`}>
                      {isSharingLocation ? 'Broadcasting Coordinates' : 'Telemetry Standby'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                    Click below to broadcast simulated live GPS movement to coordinating hospitals and tracking patients.
                  </p>

                  <button
                    onClick={toggleLocationSharing}
                    className={`btn ${isSharingLocation ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}
                  >
                    {isSharingLocation ? (
                      <>
                        <Square size={16} /> STOP LOCATION SHARING
                      </>
                    ) : (
                      <>
                        <Play size={16} /> START LOCATION SHARING
                      </>
                    )}
                  </button>

                  <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#cbd5e1', background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '6px' }}>
                    <div>Current Lat: <strong>{ambulance?.latitude || ambulance?.currentLocation?.lat || 18.5204}</strong></div>
                    <div>Current Lng: <strong>{ambulance?.longitude || ambulance?.currentLocation?.lng || 73.8567}</strong></div>
                    <div>Speed: <strong>{ambulance?.currentLocation?.speedKmph || 0} km/h</strong></div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Map View */}
              <div>
                <div className="card" style={{ height: '100%', minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
                  <div className="card-header">
                    <div className="card-title">
                      <Navigation size={18} color="#38bdf8" />
                      <span>Live Navigation Radar</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pune Medical Grid</span>
                  </div>
                  <div style={{ flex: 1, minHeight: '400px' }}>
                    <LiveMap
                      hospitals={hospitals}
                      ambulances={ambulance ? [ambulance] : []}
                      activeRequest={assignedRequest}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REQUESTS (History of Dispatches) */}
          {activeTab === 'REQUESTS' && (
            <div className="tab-pane">
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                  Ambulance Emergency Dispatch Queue
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  View assigned, active, and completed emergency dispatches.
                </p>
              </div>

              {allRequests.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No Dispatches Found"
                  description="No emergency requests have been logged on this unit."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  {allRequests.map((r) => (
                    <div key={r.id} className="card" style={{ border: '1px solid var(--border-card)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>#{r.id}</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>{r.type}</h4>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{r.patientName || 'Emergency Patient'}</span>
                        </div>
                        <StatusBadge status={r.status} tripStatus={r.ambulanceTripStatus} />
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px', margin: '0.75rem 0' }}>
                        <div>Pickup: <strong>{r.details?.location || 'Pune Region'}</strong></div>
                        <div>Destination: <strong>{r.targetHospitalName || 'Network Hospital'}</strong></div>
                        {r.responseNotes && <div>Notes: <em>"{r.responseNotes}"</em></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOCATION (Live GPS Radar) */}
          {activeTab === 'LOCATION' && (
            <div className="tab-pane">
              <div className="card" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header">
                  <div className="card-title">
                    <Navigation size={20} color="#38bdf8" />
                    <span>Real-Time Fleet Radar & GPS Streaming</span>
                  </div>
                  <button
                    onClick={toggleLocationSharing}
                    className={`btn btn-sm ${isSharingLocation ? 'btn-secondary' : 'btn-primary'}`}
                  >
                    {isSharingLocation ? 'Stop Location Stream' : 'Start Location Stream'}
                  </button>
                </div>
                <div style={{ flex: 1, minHeight: '440px' }}>
                  <LiveMap
                    hospitals={hospitals}
                    ambulances={ambulance ? [ambulance] : []}
                    activeRequest={assignedRequest}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE */}
          {activeTab === 'PROFILE' && (
            <div className="tab-pane">
              <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-card)', paddingBottom: '1rem' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                    <Truck size={30} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>{user?.name}</h3>
                    <span className="role-pill role-ambulance">DRIVER</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '0.5rem' }}>Vehicle: {ambulance?.vehicleNumber || ambulance?.vehicleNo}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.88rem', color: '#cbd5e1' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Driver Phone</span>
                    <strong>{user?.phone || '9822012345'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Base Hospital</span>
                    <strong>{ambulance?.hospitalName || 'Ruby Hall Clinic'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Vehicle Category</span>
                    <strong>{ambulance?.type || 'ACLS Advanced Life Support'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Duty State</span>
                    <strong style={{ color: '#10b981' }}>{ambulance?.status || 'AVAILABLE'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject Modal with Mandatory Reason */}
      {showRejectModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>
                Decline Emergency Dispatch
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="btn btn-secondary btn-icon">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectTrip}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Mandatory Rejection Explanation:
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  required
                  placeholder="e.g. Severe tire puncture en route, mechanical failure, road blockage..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowRejectModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ flex: 1 }} disabled={submittingReject}>
                  {submittingReject ? 'Submitting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
