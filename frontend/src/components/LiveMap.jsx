import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Phone, Navigation, Shield, Activity, Clock, MapPin, Radio, AlertCircle } from 'lucide-react';

export const LiveMap = ({
  hospitals = [],
  ambulances = [],
  activeRequest = null,
  center = [18.5204, 73.8567],
  zoom = 13,
  height = '420px',
  showHud = true
}) => {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const animFrameRef = useRef(null);

  // Live simulation HUD state
  const [etaSeconds, setEtaSeconds] = useState(260); // ~4 mins
  const [vehicleSpeed, setVehicleSpeed] = useState(48); // km/h
  const [transitProgress, setTransitProgress] = useState(0.25); // 0 to 1

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView(center, zoom);

      // Official OpenStreetMap tiles (100% Free, No API Key Required)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(leafletMapRef.current);
    }

    const map = leafletMapRef.current;

    // Clear old markers & polylines
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Custom Hospital Icon
    const hospitalIcon = L.divIcon({
      className: 'custom-map-marker hosp-marker',
      html: `<div style="background:#0284c7;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;border:2px solid white;box-shadow:0 0 14px rgba(2,132,199,0.7);font-size:16px;">🏥</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    // Custom Ambulance Icon
    const ambulanceIcon = L.divIcon({
      className: 'custom-map-marker amb-marker',
      html: `<div style="background:#ef4444;color:white;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;border:2.5px solid white;box-shadow:0 0 20px rgba(239,68,68,0.9);font-size:18px;animation:pulseBeacon 1.2s infinite;">🚑</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    // Custom Pickup Icon
    const pickupIcon = L.divIcon({
      className: 'custom-map-marker pickup-marker',
      html: `<div style="background:#10b981;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;border:2px solid white;box-shadow:0 0 12px rgba(16,185,129,0.8);font-size:15px;">📍</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Render Hospitals
    hospitals.forEach((h) => {
      if (h.lat && h.lng) {
        const marker = L.marker([h.lat, h.lng], { icon: hospitalIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 220px; padding: 4px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="font-size:18px;">🏥</span>
              <strong style="color: #0284c7; font-size: 14px;">${h.name}</strong>
            </div>
            <small style="color: #64748b; display:block; margin-bottom:6px;">${h.address || h.area}</small>
            <div style="font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 6px; display:grid; grid-template-columns:1fr 1fr; gap:4px;">
              <div>🛏️ Beds: <b>${h.resources?.generalBedsAvailable ?? '14'}</b></div>
              <div>🚨 ICU: <b style="color:#ef4444;">${h.resources?.icuBedsAvailable ?? '4'}</b></div>
              <div>💨 Oxygen: <b>${h.resources?.oxygenCylindersAvailable ?? '18'}</b></div>
              <div>🩺 On-Call: <b>${h.specialists?.length || 5}</b></div>
            </div>
            <div style="margin-top:6px; font-size:11px; color:#0284c7; font-weight:700;">
              📞 Emergency Gate: ${h.emergencyHelpline || h.phone || '1066'}
            </div>
          </div>
        `);
        markersRef.current.push(marker);
      }
    });

    // Render Ambulances
    ambulances.forEach((amb) => {
      const loc = amb.currentLocation;
      if (loc && loc.lat && loc.lng) {
        const marker = L.marker([loc.lat, loc.lng], { icon: ambulanceIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 200px; padding: 4px;">
            <strong style="color: #ef4444; font-size: 14px;">🚑 Vehicle ${amb.vehicleNo}</strong><br/>
            <span style="font-size: 12px; color: #334155;">Driver: <b>${amb.driverName}</b></span><br/>
            <span style="font-size: 12px; color: #334155;">Contact: <a href="tel:${amb.driverPhone}" style="color:#0284c7; font-weight:700;">${amb.driverPhone}</a></span><br/>
            <span style="font-size: 12px; color: #334155;">Base Hospital: <b>${amb.hospitalName || 'Command Network'}</b></span><br/>
            <span style="font-size: 11px; background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 6px; font-weight:700;">
              STATUS: ${amb.status} (GPS Live)
            </span>
          </div>
        `);
        markersRef.current.push(marker);
      }
    });

    // Render active request pickup, drop and animated path
    if (activeRequest?.details?.pickupCoords) {
      const pickup = activeRequest.details.pickupCoords;
      const marker = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="color: #10b981; font-size: 13px;">📍 Patient Pickup Scene</strong><br/>
          <span style="font-size: 12px; color: #475569;">${activeRequest.details.pickupLocation || 'Emergency Scene'}</span>
        </div>
      `);
      markersRef.current.push(marker);

      const hospitalTarget = hospitals.find((h) => h.id === activeRequest.targetHospitalId) || hospitals[0];
      const dropCoords = activeRequest.details.dropCoords || (hospitalTarget ? { lat: hospitalTarget.lat, lng: hospitalTarget.lng } : null);

      if (dropCoords) {
        // Draw Route Polyline
        const routeLine = L.polyline(
          [
            [pickup.lat, pickup.lng],
            [dropCoords.lat, dropCoords.lng]
          ],
          {
            color: '#ef4444',
            weight: 5,
            opacity: 0.85,
            dashArray: '10, 10'
          }
        ).addTo(map);
        markersRef.current.push(routeLine);

        // Interpolated Moving Dispatch Marker
        const latProgress = pickup.lat + (dropCoords.lat - pickup.lat) * transitProgress;
        const lngProgress = pickup.lng + (dropCoords.lng - pickup.lng) * transitProgress;

        const movingAmb = L.marker([latProgress, lngProgress], { icon: ambulanceIcon }).addTo(map);
        movingAmb.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <strong style="color: #ef4444;">🚑 Assigned Unit (En Route)</strong><br/>
            <span style="font-size: 12px;">Speed: <b>${vehicleSpeed} km/h</b> • ETA: <b>${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s</b></span>
          </div>
        `);
        markersRef.current.push(movingAmb);

        // Auto pan to encompass both pickup and drop
        try {
          map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
        } catch (e) {}
      }
    }
  }, [hospitals, ambulances, activeRequest, transitProgress]);

  // Live ETA and transit progress ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaSeconds((prev) => (prev > 10 ? prev - 2 : 120));
      setVehicleSpeed((prev) => Math.floor(42 + Math.random() * 16));
      setTransitProgress((prev) => (prev >= 0.9 ? 0.15 : prev + 0.015));
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  const assignedDriver = ambulances.find((a) => a.id === activeRequest?.assignedAmbulanceId) || ambulances[0];

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {/* Real-time Map Canvas */}
      <div
        ref={mapRef}
        className="map-container"
        style={{ height, width: '100%', position: 'relative', zIndex: 1 }}
        aria-label="Real-time emergency logistics and hospital coordinate map"
      />

      {/* Floating Glassmorphic Telemetry & Route Radar HUD */}
      {showHud && (
        <div
          className="map-telemetry-hud"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 999,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1rem',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.25)',
            maxWidth: '310px',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontWeight: 800 }}>
              <Radio size={14} className="animate-pulse" color="#10b981" />
              <span>LIVE SATELLITE RADAR</span>
            </div>
            <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
              GPS ONLINE
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Estimated ETA:</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#38bdf8' }}>
                {Math.floor(etaSeconds / 60)}m {etaSeconds % 60}s
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Speed:</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#10b981' }}>
                {vehicleSpeed} km/h
              </div>
            </div>
          </div>

          {assignedDriver && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.45rem 0.6rem', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.78rem' }}>
              <div style={{ fontWeight: 700, color: '#f8fafc' }}>Unit: {assignedDriver.vehicleNo}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Driver: {assignedDriver.driverName}</div>
            </div>
          )}

          {assignedDriver && assignedDriver.driverPhone && (
            <a
              href={`tel:${assignedDriver.driverPhone}`}
              className="btn btn-success btn-sm"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                fontWeight: 800,
                fontSize: '0.8rem',
                textDecoration: 'none',
                padding: '0.4rem'
              }}
            >
              <Phone size={13} />
              <span>Call Dispatch Driver ({assignedDriver.driverPhone})</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
};
