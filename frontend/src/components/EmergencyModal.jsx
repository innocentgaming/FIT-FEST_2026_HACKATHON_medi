import React, { useState, useEffect } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { LiveMap } from './LiveMap';
import {
  AlertTriangle,
  Truck,
  Droplet,
  Building2,
  PhoneCall,
  X,
  CheckCircle2,
  Navigation,
  Wind,
  Search,
  Activity,
  MapPin,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  Check,
  Radio,
  ExternalLink
} from 'lucide-react';

export const EmergencyModal = () => {
  const {
    isEmergencyModalOpen,
    closeEmergencyMode,
    emergencyTab,
    setEmergencyTab,
    activeEmergencyRequest,
    setActiveEmergencyRequest,
    submitQuickAmbulance
  } = useEmergency();

  const { user } = useAuth();
  const { liveRequestUpdate, liveLocationUpdate, notifications } = useSocket() || {};

  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [bloodMatches, setBloodMatches] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Request Ambulance Form State
  const [pickupLocation, setPickupLocation] = useState(user?.address || 'Kothrud, Pune');
  const [targetHospitalId, setTargetHospitalId] = useState('hosp_ruby_hall');
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('CRITICAL');
  const [emergencyNote, setEmergencyNote] = useState('Emergency medical evacuation & rapid transit required');
  const [requiresOxygen, setRequiresOxygen] = useState(true);

  // Blood Search State
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'B+');
  const [unitsRequired, setUnitsRequired] = useState(2);
  const [bloodLocation, setBloodLocation] = useState('Pune');
  const [bloodUrgency, setBloodUrgency] = useState('URGENT');
  const [bloodSearchLoading, setBloodSearchLoading] = useState(false);
  const [bloodRequestSuccess, setBloodRequestSuccess] = useState(null);

  // Facility Filters State
  const [facilityTypeFilter, setFacilityTypeFilter] = useState('ALL'); // ALL, HOSPITAL, CLINIC, BLOOD_BANK
  const [resourceFilter, setResourceFilter] = useState('ALL'); // ALL, BEDS, ICU, VENTILATOR, OXYGEN, BLOOD
  const [facilitySearchQuery, setFacilitySearchQuery] = useState('');

  // Timeline steps definition
  const TIMELINE_STEPS = [
    { key: 'REQUESTED', label: 'Requested', desc: 'Patient / Hospital triggered emergency' },
    { key: 'PENDING', label: 'Pending', desc: 'Matching nearest available fleet unit' },
    { key: 'ASSIGNED', label: 'Assigned', desc: 'Driver alerted & assigned to dispatch' },
    { key: 'ACCEPTED', label: 'Accepted', desc: 'Driver confirmed & en route to scene' },
    { key: 'ON_THE_WAY', label: 'On The Way', desc: 'Ambulance in-transit to pickup point' },
    { key: 'ARRIVED', label: 'Arrived', desc: 'Unit reached scene / patient loaded' },
    { key: 'COMPLETED', label: 'Completed', desc: 'Delivered safely to hospital emergency room' }
  ];

  useEffect(() => {
    if (isEmergencyModalOpen) {
      loadEmergencyData();
    }
  }, [isEmergencyModalOpen]);

  useEffect(() => {
    if (liveRequestUpdate) {
      if (activeEmergencyRequest && liveRequestUpdate.id === activeEmergencyRequest.id) {
        setActiveEmergencyRequest(liveRequestUpdate);
      }
      loadRecentRequests();
    }
  }, [liveRequestUpdate]);

  useEffect(() => {
    if (liveLocationUpdate && ambulances.length > 0) {
      setAmbulances((prev) =>
        prev.map((a) =>
          a.id === liveLocationUpdate.ambulanceId
            ? { ...a, currentLocation: liveLocationUpdate.currentLocation, latitude: liveLocationUpdate.latitude, longitude: liveLocationUpdate.longitude }
            : a
        )
      );
    }
  }, [liveLocationUpdate]);

  // Keyboard accessibility: ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isEmergencyModalOpen) {
        closeEmergencyMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEmergencyModalOpen]);

  const loadEmergencyData = async () => {
    try {
      setLoading(true);
      const [hospRes, ambRes, reqsRes] = await Promise.all([
        api.getHospitals(),
        api.getAmbulances(),
        api.getRequests()
      ]);
      setHospitals(hospRes.hospitals || []);
      setAmbulances(ambRes.ambulances || []);
      setRecentRequests(reqsRes.requests || []);

      // If active emergency request exists, link it
      const active = (reqsRes.requests || []).find(
        (r) =>
          (r.patientId === user?.id || !user?.id) &&
          r.type === 'AMBULANCE' &&
          ['PENDING', 'ASSIGNED', 'ACCEPTED'].includes(r.status)
      );
      if (active && !activeEmergencyRequest) {
        setActiveEmergencyRequest(active);
      }

      // Initial Blood Search
      handleBloodSearch();
    } catch (err) {
      console.error('Error loading emergency data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentRequests = async () => {
    try {
      const res = await api.getRequests();
      setRecentRequests(res.requests || []);
    } catch (err) {
      console.error('Error refreshing requests:', err);
    }
  };

  const handleBloodSearch = async (e) => {
    if (e) e.preventDefault();
    setBloodSearchLoading(true);
    setBloodRequestSuccess(null);
    try {
      const res = await api.searchBlood({
        bloodGroup,
        unitsRequired,
        location: bloodLocation,
        urgency: bloodUrgency
      });
      setBloodMatches(res.matches || []);
    } catch (err) {
      console.error('Error searching blood:', err);
    } finally {
      setBloodSearchLoading(false);
    }
  };

  const handleQuickBloodRequisition = async (match) => {
    try {
      const req = await api.createRequest({
        type: 'BLOOD',
        targetHospitalId: match.hospitalId,
        priority: bloodUrgency === 'CRITICAL' ? 'EMERGENCY' : 'URGENT',
        details: {
          bloodGroup: match.bloodGroup,
          unitsRequired,
          location: bloodLocation,
          urgency: bloodUrgency,
          administrativeNote: `Direct emergency requisition for ${unitsRequired} units of ${match.bloodGroup} at ${match.hospitalName}.`
        }
      });
      setBloodRequestSuccess(`Requisition #${req.request.id} submitted directly to ${match.hospitalName} Blood Bank.`);
      loadRecentRequests();
    } catch (err) {
      alert('Error creating blood request: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDispatchAmbulance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const req = await submitQuickAmbulance({
        pickupLocation,
        pickupCoords: { lat: 18.5074, lng: 73.8077 },
        hospitalId: targetHospitalId,
        ambulanceId: selectedAmbulanceId || undefined,
        urgency: urgencyLevel,
        emergencyType: emergencyNote,
        requiresOxygen
      });
      setActiveEmergencyRequest(req);
      setEmergencyTab('STATUS');
      loadRecentRequests();
    } catch (err) {
      alert('Error dispatching ambulance: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to calculate timeline step index
  const getActiveStepIndex = () => {
    if (!activeEmergencyRequest) return 0;
    const { status, ambulanceTripStatus } = activeEmergencyRequest;
    if (status === 'COMPLETED') return 6;
    if (ambulanceTripStatus === 'Arrived' || ambulanceTripStatus === 'ARRIVED') return 5;
    if (ambulanceTripStatus === 'On the Way' || ambulanceTripStatus === 'ON_THE_WAY') return 4;
    if (status === 'ACCEPTED') return 3;
    if (status === 'ASSIGNED') return 2;
    if (status === 'PENDING') return 1;
    return 0;
  };

  const activeStepIdx = getActiveStepIndex();

  // Facility filtering
  const filteredFacilities = hospitals.filter((h) => {
    const q = facilitySearchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      h.name?.toLowerCase().includes(q) ||
      h.area?.toLowerCase().includes(q) ||
      h.address?.toLowerCase().includes(q) ||
      h.city?.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    // Type filter
    if (facilityTypeFilter === 'HOSPITAL' && !h.name?.toLowerCase().includes('hospital') && !h.type?.toLowerCase().includes('hospital')) {
      return false;
    }
    if (facilityTypeFilter === 'CLINIC' && !h.name?.toLowerCase().includes('clinic') && !h.type?.toLowerCase().includes('clinic')) {
      return false;
    }
    if (facilityTypeFilter === 'BLOOD_BANK' && !Object.values(h.bloodBank || {}).some((v) => v > 0)) {
      return false;
    }

    // Resource filter
    if (resourceFilter === 'BEDS' && (h.resources?.generalBedsAvailable || 0) <= 0) return false;
    if (resourceFilter === 'ICU' && (h.resources?.icuBedsAvailable || 0) <= 0) return false;
    if (resourceFilter === 'VENTILATOR' && (h.resources?.ventilatorsAvailable || 0) <= 0) return false;
    if (resourceFilter === 'OXYGEN' && (h.resources?.oxygenCylindersAvailable || 0) <= 0) return false;
    if (resourceFilter === 'BLOOD' && !Object.values(h.bloodBank || {}).some((v) => v > 0)) return false;

    return true;
  });

  const availableAmbulancesList = ambulances.filter(
    (a) => (a.status || '').toUpperCase().replace(' ', '_') === 'AVAILABLE'
  );

  if (!isEmergencyModalOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
      style={{
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(5, 10, 20, 0.88)'
      }}
    >
      <div
        className="modal-content modal-emergency"
        style={{
          maxWidth: '1000px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0f1d',
          border: '2px solid #ef4444',
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.35)',
          padding: '1.25rem',
          overflowY: 'auto'
        }}
      >
        {/* Safety Disclaimer */}
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.25) 0%, rgba(245, 158, 11, 0.2) 100%)',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            padding: '0.5rem 0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#fecaca'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={16} color="#ef4444" />
            <span>
              <strong>EMERGENCY COORDINATION PROTOCOL:</strong> For administrative intake, dispatch, and resource logistics only. No medical advice, diagnosis, or clinical treatment.
            </span>
          </div>
          <span style={{ fontWeight: 800, color: '#fde68a' }}>CALL 108 / 112 IN LIFE THREAT</span>
        </div>

        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            paddingBottom: '0.85rem',
            marginBottom: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                background: '#ef4444',
                color: '#fff',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(239,68,68,0.6)'
              }}
            >
              <AlertTriangle size={26} />
            </div>
            <div>
              <h2 id="emergency-title" style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f87171', letterSpacing: '0.5px', margin: 0 }}>
                🚨 EMERGENCY COMMAND CENTER
              </h2>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                Unified Multi-Facility Dispatch & Healthcare Resource Response
              </div>
            </div>
          </div>

          <button
            onClick={closeEmergencyMode}
            className="btn btn-secondary btn-icon"
            aria-label="Close Emergency Screen (Press Escape)"
            title="Close (Esc)"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Four Major Action Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '0.65rem',
            marginBottom: '1.25rem'
          }}
        >
          <button
            onClick={() => setEmergencyTab('AMBULANCE')}
            className={`btn ${emergencyTab === 'AMBULANCE' ? 'btn-danger' : 'btn-secondary'}`}
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 800,
              border: emergencyTab === 'AMBULANCE' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Truck size={18} />
            <span>🚑 REQUEST AMBULANCE</span>
          </button>

          <button
            onClick={() => setEmergencyTab('BLOOD')}
            className={`btn ${emergencyTab === 'BLOOD' ? 'btn-danger' : 'btn-secondary'}`}
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 800,
              border: emergencyTab === 'BLOOD' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Droplet size={18} />
            <span>🩸 FIND BLOOD</span>
          </button>

          <button
            onClick={() => setEmergencyTab('FACILITIES')}
            className={`btn ${emergencyTab === 'FACILITIES' ? 'btn-danger' : 'btn-secondary'}`}
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 800,
              border: emergencyTab === 'FACILITIES' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Building2 size={18} />
            <span>🏥 FIND FACILITY</span>
          </button>

          <button
            onClick={() => setEmergencyTab('STATUS')}
            className={`btn ${emergencyTab === 'STATUS' ? 'btn-danger' : 'btn-secondary'}`}
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 800,
              border: emergencyTab === 'STATUS' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Navigation size={18} />
            <span>📋 TRACK REQUEST</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: REQUEST AMBULANCE */}
        {/* ------------------------------------------------------------- */}
        {emergencyTab === 'AMBULANCE' && (
          <div>
            <form onSubmit={handleDispatchAmbulance}>
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#f8fafc' }}>
                      📍 Patient Pickup Location:
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      required
                      placeholder="e.g. Karve Road, Sangamvadi, or landmark..."
                    />
                    <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '3px' }}>
                      Simulated GPS coordinates: 18.5074° N, 73.8077° E (Pune Metro Zone)
                    </small>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#f8fafc' }}>
                      🏥 Target Destination Hospital:
                    </label>
                    <select
                      className="form-select"
                      value={targetHospitalId}
                      onChange={(e) => setTargetHospitalId(e.target.value)}
                    >
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} — ({h.resources?.icuBedsAvailable || 0} ICU beds, {h.resources?.ventilatorsAvailable || 0} Vents)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        ⚡ Urgency Level:
                      </label>
                      <select
                        className="form-select"
                        value={urgencyLevel}
                        onChange={(e) => setUrgencyLevel(e.target.value)}
                      >
                        <option value="NORMAL">NORMAL (Stable Patient)</option>
                        <option value="URGENT">URGENT (Time Sensitive)</option>
                        <option value="CRITICAL">CRITICAL (High Priority)</option>
                        <option value="EMERGENCY">EMERGENCY (Immediate Response)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0, justifyContent: 'center' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          padding: '0.65rem 0.85rem',
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '8px',
                          marginTop: '1.4rem'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={requiresOxygen}
                          onChange={(e) => setRequiresOxygen(e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: '#0284c7' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Wind size={16} color="#38bdf8" />
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#38bdf8' }}>ACLS / Oxygen Unit</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      📝 Emergency Reason / Administrative Note:
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={emergencyNote}
                      onChange={(e) => setEmergencyNote(e.target.value)}
                      placeholder="e.g. Acute chest distress, road trauma, severe desaturation..."
                    />
                  </div>
                </div>

                {/* Nearby Available Fleet Units */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Nearby Fleet Units ({availableAmbulancesList.length} Available):</span>
                    <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Auto-assigns nearest if unselected</span>
                  </label>

                  <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {availableAmbulancesList.map((amb, idx) => {
                      const isSelected = selectedAmbulanceId === amb.id;
                      const approxDist = (2.1 + idx * 1.4).toFixed(1);
                      return (
                        <div
                          key={amb.id}
                          onClick={() => setSelectedAmbulanceId(isSelected ? '' : amb.id)}
                          style={{
                            background: isSelected ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-input)',
                            border: isSelected ? '1px solid #ef4444' : '1px solid var(--border-card)',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Truck size={16} color="#fbbf24" />
                              <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{amb.vehicleNumber || amb.vehicleNo}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#a78bfa' }}>({amb.type || 'ACLS'})</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                              Driver: {amb.driverName} • Base: {amb.hospitalName}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8' }}>~{approxDist} km away</div>
                            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>🟢 AVAILABLE</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-danger"
                    style={{
                      width: '100%',
                      padding: '0.9rem',
                      fontSize: '1.05rem',
                      fontWeight: 900,
                      boxShadow: '0 0 20px rgba(239,68,68,0.5)'
                    }}
                  >
                    <Truck size={22} />
                    {submitting ? 'DISPATCHING NEAREST UNIT...' : '🚨 CONFIRM & DISPATCH AMBULANCE'}
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Helpline Strip */}
            <div
              style={{
                marginTop: '1.25rem',
                background: 'var(--bg-input)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-card)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 700, fontSize: '0.85rem' }}>
                <PhoneCall size={16} /> Direct Emergency Control:
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                <span>Ambulance Network: <strong style={{ color: '#38bdf8' }}>108 / 112</strong></span>
                <span>Ruby Hall Trauma: <strong style={{ color: '#38bdf8' }}>020-66455666</strong></span>
                <span>KEM ER: <strong style={{ color: '#38bdf8' }}>020-66037333</strong></span>
                <span>Sahyadri Emergency: <strong style={{ color: '#38bdf8' }}>020-67213100</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: FIND BLOOD */}
        {/* ------------------------------------------------------------- */}
        {emergencyTab === 'BLOOD' && (
          <div>
            <form onSubmit={handleBloodSearch} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0, minWidth: '130px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Blood Group:</label>
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

              <div className="form-group" style={{ margin: 0, width: '110px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Units Needed:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="form-control"
                  value={unitsRequired}
                  onChange={(e) => setUnitsRequired(Number(e.target.value))}
                />
              </div>

              <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Location / City:</label>
                <input
                  type="text"
                  className="form-control"
                  value={bloodLocation}
                  onChange={(e) => setBloodLocation(e.target.value)}
                  placeholder="e.g. Pune / Deccan"
                />
              </div>

              <div className="form-group" style={{ margin: 0, minWidth: '130px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Urgency:</label>
                <select
                  className="form-select"
                  value={bloodUrgency}
                  onChange={(e) => setBloodUrgency(e.target.value)}
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="URGENT">URGENT</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <button type="submit" disabled={bloodSearchLoading} className="btn btn-primary" style={{ minWidth: '130px' }}>
                <Search size={16} />
                {bloodSearchLoading ? 'Searching...' : 'Search Stock'}
              </button>
            </form>

            {bloodRequestSuccess && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', padding: '0.65rem 1rem', borderRadius: '6px', color: '#a7f3d0', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ✅ {bloodRequestSuccess}
              </div>
            )}

            <div className="table-responsive card" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Blood Bank / Hospital</th>
                    <th>Area & City</th>
                    <th>Group</th>
                    <th>Live Stock Units</th>
                    <th>Availability Status</th>
                    <th>Direct Requisition</th>
                  </tr>
                </thead>
                <tbody>
                  {bloodMatches.map((m) => (
                    <tr key={m.hospitalId}>
                      <td>
                        <strong style={{ color: '#f8fafc' }}>{m.hospitalName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Helpline: {m.emergencyHelpline || m.phone}</div>
                      </td>
                      <td>
                        <div>{m.area || 'Pune Central'}</div>
                        <small style={{ color: '#64748b' }}>{m.city || 'Pune'}</small>
                      </td>
                      <td>
                        <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '1rem' }}>{m.bloodGroup}</span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '1.15rem', color: m.availableUnits >= unitsRequired ? '#10b981' : '#f59e0b' }}>
                          {m.availableUnits} Units
                        </strong>
                      </td>
                      <td>
                        {m.isSufficient ? (
                          <span className="status-badge status-accepted">Sufficient Stock</span>
                        ) : (
                          <span className="status-badge status-scheduled">Limited Stock</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleQuickBloodRequisition(m)}
                            className="btn btn-sm btn-danger"
                          >
                            <Droplet size={14} /> Requisition
                          </button>
                          <a
                            href={`tel:${m.emergencyHelpline || m.phone}`}
                            className="btn btn-sm btn-secondary"
                            title="Call facility"
                          >
                            <PhoneCall size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: FIND HEALTHCARE FACILITY */}
        {/* ------------------------------------------------------------- */}
        {emergencyTab === 'FACILITIES' && (
          <div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Type Filter Buttons */}
              <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-input)', padding: '4px', borderRadius: '8px' }}>
                {['ALL', 'HOSPITAL', 'CLINIC', 'BLOOD_BANK'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFacilityTypeFilter(t)}
                    className={`btn btn-sm ${facilityTypeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Resource Filter */}
              <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-input)', padding: '4px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center', marginLeft: '4px' }}>Filter:</span>
                {['ALL', 'BEDS', 'ICU', 'VENTILATOR', 'OXYGEN', 'BLOOD'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setResourceFilter(r)}
                    className={`btn btn-sm ${resourceFilter === r ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <input
                type="text"
                className="form-control"
                placeholder="Search facility name, area, address..."
                value={facilitySearchQuery}
                onChange={(e) => setFacilitySearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: '180px' }}
              />
            </div>

            <div className="grid-2" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {filteredFacilities.map((h) => (
                <div key={h.id} className="card" style={{ padding: '1rem', background: 'var(--bg-input)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', color: '#38bdf8' }}>{h.name}</h4>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{h.address}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <a
                        href={h.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-secondary btn-icon"
                        title="Open in Google Maps"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <a
                        href={`tel:${h.emergencyHelpline || h.phone}`}
                        className="btn btn-sm btn-danger"
                        style={{ padding: '0.25rem 0.6rem' }}
                      >
                        <PhoneCall size={14} /> Call
                      </a>
                    </div>
                  </div>

                  <div className="grid-4" style={{ marginTop: '0.75rem', gap: '0.5rem' }}>
                    <div style={{ background: 'var(--bg-subtle)', padding: '0.4rem', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Gen Beds</span>
                      <strong style={{ fontSize: '1rem', color: '#38bdf8' }}>{h.resources?.generalBedsAvailable ?? 0}</strong>
                    </div>

                    <div style={{ background: 'rgba(239,68,68,0.1)', padding: '0.4rem', borderRadius: '4px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <span style={{ fontSize: '0.68rem', color: '#fca5a5', display: 'block' }}>ICU Beds</span>
                      <strong style={{ fontSize: '1rem', color: '#ef4444' }}>{h.resources?.icuBedsAvailable ?? 0}</strong>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '0.4rem', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Vents</span>
                      <strong style={{ fontSize: '1rem', color: '#a78bfa' }}>{h.resources?.ventilatorsAvailable ?? 0}</strong>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '0.4rem', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Oxygen</span>
                      <strong style={{ fontSize: '1rem', color: '#34d399' }}>{h.resources?.oxygenCylindersAvailable ?? 0}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: TRACK EMERGENCY REQUEST & VISUAL TIMELINE */}
        {/* ------------------------------------------------------------- */}
        {emergencyTab === 'STATUS' && (
          <div>
            {activeEmergencyRequest ? (
              <div>
                {/* Active Incident Header Card */}
                <div
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <StatusBadge
                        status={activeEmergencyRequest.status}
                        tripStatus={activeEmergencyRequest.ambulanceTripStatus}
                      />
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>
                        Incident #{activeEmergencyRequest.id}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '3px' }}>
                      Assigned Vehicle: <strong>{activeEmergencyRequest.assignedAmbulanceVehicle || 'MH-12-CR-1011'}</strong> • Patient: {activeEmergencyRequest.patientName}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Destination Facility</div>
                    <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>{activeEmergencyRequest.targetHospitalName || 'Designated Facility'}</strong>
                  </div>
                </div>

                {/* VISUAL 7-STEP TIMELINE */}
                <div
                  style={{
                    background: 'var(--bg-input)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-card)',
                    marginBottom: '1rem'
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fde68a', marginBottom: '0.85rem' }}>
                    🚨 REAL-TIME INCIDENT PROGRESSION TIMELINE:
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      position: 'relative',
                      gap: '0.25rem'
                    }}
                  >
                    {TIMELINE_STEPS.map((step, idx) => {
                      const isPast = idx < activeStepIdx;
                      const isCurrent = idx === activeStepIdx;
                      const isFuture = idx > activeStepIdx;

                      return (
                        <div
                          key={step.key}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            flex: 1,
                            textAlign: 'center'
                          }}
                        >
                          <div
                            style={{
                              width: isCurrent ? '34px' : '26px',
                              height: isCurrent ? '34px' : '26px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isPast ? '#10b981' : isCurrent ? '#ef4444' : 'var(--bg-subtle)',
                              color: isPast || isCurrent ? '#fff' : '#64748b',
                              border: isCurrent ? '2px solid #fecaca' : isPast ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                              boxShadow: isCurrent ? '0 0 12px #ef4444' : 'none',
                              fontWeight: 800,
                              fontSize: isCurrent ? '0.85rem' : '0.75rem',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            {isPast ? <Check size={14} /> : idx + 1}
                          </div>

                          <div
                            style={{
                              fontSize: isCurrent ? '0.78rem' : '0.7rem',
                              fontWeight: isCurrent ? 800 : 600,
                              color: isPast ? '#10b981' : isCurrent ? '#f87171' : '#64748b',
                              marginTop: '4px'
                            }}
                          >
                            {step.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live GPS Map View */}
                <div className="card" style={{ padding: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700 }}>
                      <Radio size={16} color="#38bdf8" />
                      <span>Live Radar & Route Stream (Simulated GPS)</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#10b981' }}>🟢 WebSocket Stream Live</span>
                  </div>

                  <LiveMap
                    hospitals={hospitals}
                    ambulances={ambulances}
                    activeRequest={activeEmergencyRequest}
                    height="280px"
                  />
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <Truck size={42} color="#64748b" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1.2rem' }}>No Active Emergency Incident</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', maxWidth: '420px', margin: '0.5rem auto 1.25rem' }}>
                  You do not have an ongoing emergency ambulance request. Select "Request Ambulance" to dispatch a unit immediately.
                </p>
                <button
                  onClick={() => setEmergencyTab('AMBULANCE')}
                  className="btn btn-danger"
                  style={{ fontWeight: 800 }}
                >
                  <Truck size={18} /> Request Emergency Ambulance
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
