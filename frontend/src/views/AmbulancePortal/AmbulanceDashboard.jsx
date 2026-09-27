import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';

export const AmbulanceDashboard = () => {
  const { user } = useAuth();
  const { liveRequestUpdate, socket } = useSocket();

  const [ambulance, setAmbulance] = useState(null);
  const [assignedRequest, setAssignedRequest] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulatingGps, setSimulatingGps] = useState(false);

  const ambulanceId = user?.ambulanceId || 'amb_pune_101';

  useEffect(() => {
    loadAmbulanceData();
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
      alert('Error updating status: ' + err.message);
    }
  };

  const handleAcceptTrip = async () => {
    if (!assignedRequest) return;
    try {
      await api.updateRequestStatus(assignedRequest.id, {
        status: 'ACCEPTED',
        ambulanceTripStatus: 'ON_THE_WAY',
        responseNotes: `Driver ${user.name} accepted pickup. En route to patient.`
      });
      loadAmbulanceData();
    } catch (err) {
      alert('Error accepting trip: ' + err.message);
    }
  };

  const handleUpdateTripStep = async (stepName) => {
    if (!assignedRequest) return;
    try {
      if (stepName === 'COMPLETED') {
        await api.updateRequestStatus(assignedRequest.id, {
          status: 'COMPLETED',
          ambulanceTripStatus: 'COMPLETED',
          responseNotes: `Patient delivered safely to ${assignedRequest.targetHospitalName}. Trip completed.`
        });
      } else {
        await api.updateRequestStatus(assignedRequest.id, {
          ambulanceTripStatus: stepName,
          responseNotes: `Ambulance status updated to: ${stepName.replace('_', ' ')}`
        });
      }
      loadAmbulanceData();
    } catch (err) {
      alert('Error updating trip step: ' + err.message);
    }
  };

  // Simulate GPS coordinates moving towards destination
  const handleSimulateMovement = async () => {
    if (!ambulance) return;
    setSimulatingGps(true);

    const targetCoords = assignedRequest?.details?.pickupCoords || { lat: 18.5314, lng: 73.8765 };
    const current = ambulance.currentLocation || { lat: 18.5204, lng: 73.8567 };

    // Interpolate slight shift
    const nextLat = current.lat + (targetCoords.lat - current.lat) * 0.3;
    const nextLng = current.lng + (targetCoords.lng - current.lng) * 0.3;

    try {
      const res = await api.updateAmbulanceLocation(ambulance.id, {
        lat: nextLat,
        lng: nextLng,
        speedKmph: 45,
        address: 'Live In-Transit Location (Simulated GPS Stream)'
      });
      setAmbulance(res.ambulance);
    } catch (err) {
      console.error('Error simulating GPS:', err);
    } finally {
      setTimeout(() => setSimulatingGps(false), 800);
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
            <span style={{ color: '#fde68a', fontSize: '0.8rem' }}>Vehicle: {ambulance?.vehicleNo}</span>
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
          {['Available', 'On Duty', 'Offline'].map((st) => {
            const isActive = ambulance?.status === st;
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
                {st}
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
                    ⚠️ Condition: {assignedRequest.details?.emergencyType || 'Urgent Medical Transfer'}
                  </div>

                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                    <div>📍 <strong>Pickup:</strong> {assignedRequest.details?.pickupLocation}</div>
                    <div style={{ marginTop: '4px' }}>🏥 <strong>Destination Hospital:</strong> {assignedRequest.targetHospitalName}</div>
                  </div>
                </div>

                {/* TRIP LIFECYCLE PROGRESSION CONTROLS */}
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.5rem' }}>
                    Multi-Step Dispatch Lifecycle Progression:
                  </div>

                  {assignedRequest.status === 'ASSIGNED' && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={handleAcceptTrip} className="btn btn-success" style={{ flex: 1 }}>
                        <CheckCircle size={16} /> Accept Dispatch (Start Trip)
                      </button>
                    </div>
                  )}

                  {assignedRequest.status === 'ACCEPTED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleUpdateTripStep('ON_THE_WAY')}
                          className={`btn btn-sm ${assignedRequest.ambulanceTripStatus === 'ON_THE_WAY' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1 }}
                        >
                          1. En Route / On The Way
                        </button>
                        <button
                          onClick={() => handleUpdateTripStep('ARRIVED')}
                          className={`btn btn-sm ${assignedRequest.ambulanceTripStatus === 'ARRIVED' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1 }}
                        >
                          2. Arrived at Scene
                        </button>
                      </div>

                      <button
                        onClick={() => handleUpdateTripStep('COMPLETED')}
                        className="btn btn-success"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                      >
                        <CheckCircle size={16} /> Mark Trip Completed (Delivered to ER)
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
              <span className="role-pill role-ambulance">SIMULATED GPS ACTIVE</span>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem' }}>
              For FIT FEST hackathon demonstration, click below to stream simulated telemetry pulses to active patient & admin maps:
            </p>

            <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '1rem' }}>
              <div>Current Coords: <strong>{ambulance?.currentLocation?.lat?.toFixed(4)}, {ambulance?.currentLocation?.lng?.toFixed(4)}</strong></div>
              <div>Estimated Speed: <strong>{ambulance?.currentLocation?.speedKmph || 40} km/h</strong></div>
              <div>Heading: <strong>{ambulance?.currentLocation?.heading || 90}°</strong></div>
            </div>

            <button
              onClick={handleSimulateMovement}
              disabled={simulatingGps}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <Navigation size={16} />
              {simulatingGps ? 'Broadcasting Coordinates...' : 'Stream Simulated GPS Pulse'}
            </button>
          </div>
        </div>

        {/* Right Column: Live Route Map */}
        <div>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Live Dispatch Radar & Route View</h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pune Dispatch Network</span>
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
    </div>
  );
};
