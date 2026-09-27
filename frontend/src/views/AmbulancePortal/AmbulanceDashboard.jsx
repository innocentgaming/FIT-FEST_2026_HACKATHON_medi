import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { LiveMap } from '../../components/LiveMap';
import {
  Truck,
  MapPin,
  Navigation,
  CheckCircle,
  XCircle,
  Radio,
  Phone,
  Clock,
  Shield,
  AlertCircle,
  Play,
  Square
} from 'lucide-react';

export const AmbulanceDashboard = () => {
  const { user } = useAuth();
  const { liveRequestUpdate, socket } = useSocket();

  const [ambulance, setAmbulance] = useState(null);
  const [assignedRequest, setAssignedRequest] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const [ambRes, reqsRes, hospsRes] = await Promise.all([
        api.getAmbulances(),
        api.getRequests(),
        api.getHospitals()
      ]);

      const foundAmb = (ambRes.ambulances || []).find((a) => a.id === ambulanceId) || ambRes.ambulances?.[0];
      setAmbulance(foundAmb);
      setHospitals(hospsRes.hospitals || []);

      // Find active request assigned to this ambulance
      const activeReq = (reqsRes.requests || []).find(
        (r) =>
          r.assignedAmbulanceId === foundAmb?.id &&
          ['PENDING', 'ASSIGNED', 'ACCEPTED'].includes(r.status)
      );
      setAssignedRequest(activeReq || null);
    } catch (err) {
      console.error('Error loading ambulance data:', err);
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

  // Toggle periodic live simulated GPS sharing
  const toggleLocationSharing = () => {
    if (isSharingLocation) {
      if (sharingIntervalRef.current) clearInterval(sharingIntervalRef.current);
      setIsSharingLocation(false);
    } else {
      setIsSharingLocation(true);
      // Run immediately
      sendLocationPulse();
      // Periodically update every 4 seconds
      sharingIntervalRef.current = setInterval(() => {
        sendLocationPulse();
      }, 4000);
    }
  };

  const sendLocationPulse = async () => {
    if (!ambulance) return;
    const currentLat = ambulance.latitude || ambulance.currentLocation?.lat || 18.5204;
    const currentLng = ambulance.longitude || ambulance.currentLocation?.lng || 73.8567;

    // Small jitter/shift towards Pune center or destination
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
    <div>
      {/* Driver Header */}
      <div
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
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="role-pill role-ambulance">AMBULANCE DRIVER PORTAL</span>
            <span style={{ color: '#fde68a', fontSize: '0.8rem' }}>Vehicle: {ambulance?.vehicleNumber || ambulance?.vehicleNo}</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.35rem' }}>
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
      </div>

      <div className="grid-2">
        {/* Left Column: Active Trip & Progression */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div className="card-title">
                <Truck size={20} color="#fbbf24" />
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
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Emergency Request #{assignedRequest.id}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                    Patient: {assignedRequest.patientName} ({assignedRequest.patientPhone})
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#fca5a5', marginTop: '4px' }}>
                    ⚠️ Priority: <strong>{assignedRequest.priority}</strong> • Urgency: {assignedRequest.details?.urgency || 'CRITICAL'}
                  </div>

                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                    <div>📍 <strong>Pickup Location:</strong> {assignedRequest.details?.pickupLocation || assignedRequest.details?.location || 'Emergency Site'}</div>
                    <div style={{ marginTop: '4px' }}>🏥 <strong>Target Hospital:</strong> {assignedRequest.targetHospitalName || 'Designated Facility'}</div>
                    {assignedRequest.details?.administrativeNote && (
                      <div style={{ marginTop: '4px', color: '#cbd5e1' }}>📝 <strong>Notes:</strong> {assignedRequest.details.administrativeNote}</div>
                    )}
                  </div>
                </div>

                {/* TRIP LIFECYCLE PROGRESSION CONTROLS */}
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.5rem' }}>
                    Dispatch Response & Trip Progress:
                  </div>

                  {assignedRequest.status === 'ASSIGNED' && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={handleAcceptTrip} className="btn btn-success" style={{ flex: 2 }}>
                        <CheckCircle size={16} /> Accept Request
                      </button>
                      <button onClick={() => setShowRejectModal(true)} className="btn btn-danger" style={{ flex: 1 }}>
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  )}

                  {assignedRequest.status === 'ACCEPTED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleUpdateTripStep('On the Way')}
                          className={`btn btn-sm ${assignedRequest.ambulanceTripStatus === 'On the Way' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1 }}
                        >
                          1. On the Way
                        </button>
                        <button
                          onClick={() => handleUpdateTripStep('Arrived')}
                          className={`btn btn-sm ${assignedRequest.ambulanceTripStatus === 'Arrived' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1 }}
                        >
                          2. Arrived
                        </button>
                      </div>

                      <button
                        onClick={() => handleUpdateTripStep('Completed')}
                        className="btn btn-success"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                      >
                        <CheckCircle size={16} /> 3. Complete Trip (Delivered to ER)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <Truck size={36} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
                <h4>No active emergency dispatch assigned</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  You will receive real-time Socket.io audio/visual notifications when a hospital or patient requests this unit.
                </p>
              </div>
            )}
          </div>

          {/* GPS Simulation Controls */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Radio size={18} color="#38bdf8" />
                <span>Simulated GPS Telemetry Streamer</span>
              </div>
              <span className="role-pill role-ambulance">
                {isSharingLocation ? '🟢 BROADCASTING DEMO GPS' : '⚪ DEMO GPS IDLE'}
              </span>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#fde68a', marginBottom: '1rem' }}>
              ℹ️ <strong>Demo / Simulated GPS:</strong> Real-time coordinates are streamed over WebSockets to hospitals and patients for testing & demonstration.
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '1rem' }}>
              <div>Current Coords: <strong>{(ambulance?.latitude || ambulance?.currentLocation?.lat || 18.5204)?.toFixed(4)}, {(ambulance?.longitude || ambulance?.currentLocation?.lng || 73.8567)?.toFixed(4)}</strong></div>
              <div>Estimated Speed: <strong>{ambulance?.currentLocation?.speedKmph || 40} km/h</strong></div>
              <div>Heading: <strong>{ambulance?.currentLocation?.heading || 90}°</strong></div>
            </div>

            <button
              onClick={toggleLocationSharing}
              className={`btn ${isSharingLocation ? 'btn-danger' : 'btn-primary'}`}
              style={{ width: '100%' }}
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
          </div>
        </div>

        {/* Right Column: Live Route Map */}
        <div>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Live Dispatch Radar & Route View</h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pune Dispatch Network (Demo GPS)</span>
            </div>

            <LiveMap
              hospitals={hospitals}
              ambulances={ambulance ? [ambulance] : []}
              activeRequest={assignedRequest}
              height="450px"
            />
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              background: '#0f172a',
              border: '1px solid #ef4444'
            }}
          >
            <div className="card-header">
              <div className="card-title" style={{ color: '#ef4444' }}>
                <AlertCircle size={20} />
                <span>Reject Dispatch Request</span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: '1rem' }}>
              System policy requires a mandatory reason for rejecting an emergency ambulance request.
            </p>

            <form onSubmit={handleRejectTrip}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Mandatory Rejection Reason:
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  required
                  placeholder="e.g. Unit undergoing emergency refuel / patient transfer in progress / mechanical inspection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={submittingReject || !rejectionReason.trim()}
                >
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
