import React, { useState, useEffect } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
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
  Wind
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

  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [bloodMatches, setBloodMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Quick Ambulance
  const [pickupLocation, setPickupLocation] = useState(user?.address || 'Flat 402, Kothrud, Pune');
  const [targetHospitalId, setTargetHospitalId] = useState('hosp_ruby_hall');
  const [emergencyType, setEmergencyType] = useState('Severe Breathlessness / Low Oxygen');
  const [requiresOxygen, setRequiresOxygen] = useState(true);

  // Blood Search State
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [unitsRequired, setUnitsRequired] = useState(2);

  useEffect(() => {
    if (isEmergencyModalOpen) {
      loadEmergencyData();
    }
  }, [isEmergencyModalOpen]);

  const loadEmergencyData = async () => {
    try {
      setLoading(true);
      const [hospRes, ambRes] = await Promise.all([
        api.getHospitals(),
        api.getAmbulances({ status: 'Available' })
      ]);
      setHospitals(hospRes.hospitals || []);
      setAmbulances(ambRes.ambulances || []);

      // Auto run blood search for default
      handleBloodSearch();
    } catch (err) {
      console.error('Error loading emergency data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBloodSearch = async () => {
    try {
      const res = await api.searchBlood({
        bloodGroup,
        unitsRequired,
        location: 'Pune',
        urgency: 'Immediate'
      });
      setBloodMatches(res.matches || []);
    } catch (err) {
      console.error('Error searching blood:', err);
    }
  };

  const handleDispatchAmbulance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const req = await submitQuickAmbulance({
        pickupLocation,
        pickupCoords: { lat: 18.5074, lng: 73.8077 }, // Kothrud coordinates
        hospitalId: targetHospitalId,
        emergencyType,
        requiresOxygen
      });
      setActiveEmergencyRequest(req);
      setEmergencyTab('STATUS');
    } catch (err) {
      alert('Error dispatching ambulance: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isEmergencyModalOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="emergency-title">
      <div className="modal-content modal-emergency">
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(239, 68, 68, 0.4)',
            paddingBottom: '1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <div>
              <h2 id="emergency-title" style={{ fontSize: '1.4rem', color: '#f87171' }}>
                🚨 EMERGENCY COMMAND CENTER
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                Live dispatch & real-time critical healthcare coordination
              </span>
            </div>
          </div>

          <button
            onClick={closeEmergencyMode}
            className="btn btn-secondary btn-icon"
            aria-label="Close emergency mode"
          >
            <X size={20} />
          </button>
        </div>

        {/* Emergency Tabs */}
        <div className="tabs-nav" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <button
            className={`tab-btn ${emergencyTab === 'AMBULANCE' ? 'active' : ''}`}
            onClick={() => setEmergencyTab('AMBULANCE')}
            style={{ color: emergencyTab === 'AMBULANCE' ? '#f87171' : undefined, borderColor: emergencyTab === 'AMBULANCE' ? '#ef4444' : undefined }}
          >
            <Truck size={16} /> 1. Request Ambulance
          </button>

          <button
            className={`tab-btn ${emergencyTab === 'BLOOD' ? 'active' : ''}`}
            onClick={() => setEmergencyTab('BLOOD')}
            style={{ color: emergencyTab === 'BLOOD' ? '#f87171' : undefined, borderColor: emergencyTab === 'BLOOD' ? '#ef4444' : undefined }}
          >
            <Droplet size={16} /> 2. Emergency Blood Lookup
          </button>

          <button
            className={`tab-btn ${emergencyTab === 'FACILITIES' ? 'active' : ''}`}
            onClick={() => setEmergencyTab('FACILITIES')}
            style={{ color: emergencyTab === 'FACILITIES' ? '#f87171' : undefined, borderColor: emergencyTab === 'FACILITIES' ? '#ef4444' : undefined }}
          >
            <Building2 size={16} /> 3. Critical Facilities & Beds
          </button>

          <button
            className={`tab-btn ${emergencyTab === 'STATUS' ? 'active' : ''}`}
            onClick={() => setEmergencyTab('STATUS')}
            style={{ color: emergencyTab === 'STATUS' ? '#f87171' : undefined, borderColor: emergencyTab === 'STATUS' ? '#ef4444' : undefined }}
          >
            <Navigation size={16} /> 4. Live Request & GPS Track
          </button>
        </div>

        {/* TAB 1: REQUEST AMBULANCE */}
        {emergencyTab === 'AMBULANCE' && (
          <div>
            <form onSubmit={handleDispatchAmbulance}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">📍 Patient Pickup Location</label>
                  <input
                    type="text"
                    className="form-control"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    required
                    placeholder="Enter full pickup address or landmark"
                  />
                  <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    Simulated GPS coordinates: 18.5074° N, 73.8077° E (Kothrud, Pune)
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">🏥 Destination Hospital</label>
                  <select
                    className="form-select"
                    value={targetHospitalId}
                    onChange={(e) => setTargetHospitalId(e.target.value)}
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.resources?.icuBedsAvailable || 0} ICU beds available)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">⚠️ Emergency Reason / Condition Note</label>
                  <input
                    type="text"
                    className="form-control"
                    value={emergencyType}
                    onChange={(e) => setEmergencyType(e.target.value)}
                    placeholder="e.g. Cardiac Emergency, Road Accident, Acute SpO2 Drop"
                  />
                </div>

                <div className="form-group" style={{ justifyContent: 'center' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer',
                      padding: '0.75rem',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px'
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
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Requires Oxygen / ACLS Unit</span>
                    </div>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-danger"
                  style={{ flex: 1, padding: '0.85rem', fontSize: '1rem', fontWeight: 800 }}
                >
                  <Truck size={20} />
                  {submitting ? 'DISPATCHING TO NEAREST UNIT...' : 'CONFIRM & DISPATCH EMERGENCY AMBULANCE'}
                </button>
              </div>
            </form>

            {/* Helpline quick dials */}
            <div
              style={{
                marginTop: '1.5rem',
                background: 'var(--bg-input)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-card)'
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PhoneCall size={16} /> Direct Emergency Helplines
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                <div>National Ambulance: <strong style={{ color: '#38bdf8' }}>108</strong></div>
                <div>Ruby Hall Trauma: <strong style={{ color: '#38bdf8' }}>020-66455666</strong></div>
                <div>KEM Emergency: <strong style={{ color: '#38bdf8' }}>020-66037333</strong></div>
                <div>Sahyadri ER: <strong style={{ color: '#38bdf8' }}>020-67213100</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EMERGENCY BLOOD LOOKUP */}
        {emergencyTab === 'BLOOD' && (
          <div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Blood Group Required</label>
                <select
                  className="form-select"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  style={{ minWidth: '120px' }}
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Units Needed</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="form-control"
                  value={unitsRequired}
                  onChange={(e) => setUnitsRequired(Number(e.target.value))}
                  style={{ width: '100px' }}
                />
              </div>

              <button onClick={handleBloodSearch} className="btn btn-primary">
                Search Live Stock
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hospital / Blood Bank</th>
                    <th>Area</th>
                    <th>Group</th>
                    <th>Live Available Units</th>
                    <th>Status</th>
                    <th>Contact Helpline</th>
                  </tr>
                </thead>
                <tbody>
                  {bloodMatches.map((m) => (
                    <tr key={m.hospitalId}>
                      <td style={{ fontWeight: 700 }}>{m.hospitalName}</td>
                      <td>{m.area}</td>
                      <td>
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>{m.bloodGroup}</span>
                      </td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                        <span style={{ color: m.availableUnits >= unitsRequired ? '#10b981' : '#ef4444' }}>
                          {m.availableUnits} Units
                        </span>
                      </td>
                      <td>
                        {m.isSufficient ? (
                          <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>
                            ✅ Sufficient Stock
                          </span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem' }}>
                            ⚠️ Limited Stock
                          </span>
                        )}
                      </td>
                      <td>
                        <a href={`tel:${m.emergencyHelpline}`} style={{ fontWeight: 600 }}>
                          📞 {m.emergencyHelpline}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CRITICAL FACILITIES */}
        {emergencyTab === 'FACILITIES' && (
          <div>
            <div className="grid-2">
              {hospitals.map((h) => (
                <div key={h.id} className="card" style={{ padding: '1rem', background: 'var(--bg-input)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', color: '#38bdf8' }}>{h.name}</h4>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{h.address}</div>
                    </div>
                    <a
                      href={`tel:${h.emergencyHelpline}`}
                      className="btn btn-sm btn-danger"
                      style={{ padding: '0.3rem 0.6rem' }}
                    >
                      <PhoneCall size={14} /> Call
                    </a>
                  </div>

                  <div className="grid-4" style={{ marginTop: '0.75rem', gap: '0.5rem' }}>
                    <div style={{ background: 'var(--bg-subtle)', padding: '0.4rem', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Gen Beds</span>
                      <strong style={{ fontSize: '1rem', color: '#38bdf8' }}>{h.resources?.generalBedsAvailable}</strong>
                    </div>

                    <div style={{ background: 'rgba(239,68,68,0.1)', padding: '0.4rem', borderRadius: '4px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <span style={{ fontSize: '0.68rem', color: '#fca5a5', display: 'block' }}>ICU Beds</span>
                      <strong style={{ fontSize: '1rem', color: '#ef4444' }}>{h.resources?.icuBedsAvailable}</strong>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '0.4rem', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Ventilators</span>
                      <strong style={{ fontSize: '1rem', color: '#a78bfa' }}>{h.resources?.ventilatorsAvailable}</strong>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '0.4rem', borderRadius: '4px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Oxygen</span>
                      <strong style={{ fontSize: '1rem', color: '#34d399' }}>{h.resources?.oxygenCylindersAvailable}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: LIVE STATUS & GPS TRACK */}
        {emergencyTab === 'STATUS' && (
          <div>
            {activeEmergencyRequest ? (
              <div>
                <div
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <StatusBadge
                        status={activeEmergencyRequest.status}
                        tripStatus={activeEmergencyRequest.ambulanceTripStatus}
                      />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        Emergency Request #{activeEmergencyRequest.id}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '4px' }}>
                      Assigned Vehicle: <strong>{activeEmergencyRequest.assignedAmbulanceVehicle || 'MH-12-CR-1011'}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Destination</div>
                    <strong style={{ color: '#38bdf8' }}>{activeEmergencyRequest.targetHospitalName || 'Ruby Hall Clinic'}</strong>
                  </div>
                </div>

                {/* Live Map */}
                <LiveMap
                  hospitals={hospitals}
                  ambulances={ambulances}
                  activeRequest={activeEmergencyRequest}
                  height="300px"
                />

                {/* Timeline */}
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                    Incident Timeline:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                    {(activeEmergencyRequest.timeline || []).map((tl, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-input)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <strong>{tl.status}</strong>: {tl.note}
                        </div>
                        <div style={{ color: '#64748b' }}>
                          {new Date(tl.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <Truck size={40} color="#64748b" style={{ margin: '0 auto 1rem' }} />
                <h3>No Active Emergency Incident</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  You do not have an ongoing emergency ambulance request. Select "Request Ambulance" to dispatch a unit.
                </p>
                <button
                  onClick={() => setEmergencyTab('AMBULANCE')}
                  className="btn btn-danger"
                  style={{ marginTop: '1rem' }}
                >
                  Create Emergency Dispatch
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
