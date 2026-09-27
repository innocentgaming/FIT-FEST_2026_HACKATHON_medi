import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export const LiveMap = ({
  hospitals = [],
  ambulances = [],
  activeRequest = null,
  center = [18.5204, 73.8567],
  zoom = 13,
  height = '380px'
}) => {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current).setView(center, zoom);

      // Dark / modern carto tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(leafletMapRef.current);
    }

    const map = leafletMapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Custom Hospital Icon
    const hospitalIcon = L.divIcon({
      className: 'custom-map-marker hosp-marker',
      html: `<div style="background:#0284c7;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;border:2px solid white;box-shadow:0 0 10px rgba(2,132,199,0.6);font-size:14px;">🏥</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Custom Ambulance Icon
    const ambulanceIcon = L.divIcon({
      className: 'custom-map-marker amb-marker',
      html: `<div style="background:#ef4444;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;border:2px solid white;box-shadow:0 0 15px rgba(239,68,68,0.8);font-size:16px;animation:pulseBeacon 1.5s infinite;">🚑</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    // Custom Pickup Icon
    const pickupIcon = L.divIcon({
      className: 'custom-map-marker pickup-marker',
      html: `<div style="background:#10b981;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;border:2px solid white;font-size:13px;">📍</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    // Render Hospitals
    hospitals.forEach((h) => {
      if (h.lat && h.lng) {
        const marker = L.marker([h.lat, h.lng], { icon: hospitalIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 200px;">
            <strong style="color: #0284c7; font-size: 14px;">${h.name}</strong><br/>
            <small style="color: #64748b;">${h.address || h.area}</small>
            <div style="margin-top: 8px; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
              <div>🛏️ General Beds: <b>${h.resources?.generalBedsAvailable ?? 'N/A'}</b></div>
              <div>🚨 ICU Beds: <b>${h.resources?.icuBedsAvailable ?? 'N/A'}</b></div>
              <div>💨 Ventilators: <b>${h.resources?.ventilatorsAvailable ?? 'N/A'}</b></div>
              <div>📞 Helpline: <b>${h.emergencyHelpline || h.phone || '1066'}</b></div>
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
          <div style="font-family: sans-serif; min-width: 190px;">
            <strong style="color: #ef4444; font-size: 14px;">🚑 ${amb.vehicleNo}</strong><br/>
            <span style="font-size: 12px; color: #334155;">Driver: <b>${amb.driverName}</b> (${amb.driverPhone})</span><br/>
            <span style="font-size: 12px; color: #334155;">Base: ${amb.hospitalName || 'Network'}</span><br/>
            <span style="font-size: 11px; background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">
              ${amb.status} (Simulated GPS Active)
            </span>
          </div>
        `);
        markersRef.current.push(marker);
      }
    });

    // Render active request pickup and route
    if (activeRequest?.details?.pickupCoords) {
      const pickup = activeRequest.details.pickupCoords;
      const marker = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif;">
          <strong style="color: #10b981;">📍 Patient Pickup Location</strong><br/>
          <small>${activeRequest.details.pickupLocation || 'Emergency Pickup'}</small>
        </div>
      `);
      markersRef.current.push(marker);

      if (activeRequest.details?.dropCoords) {
        const drop = activeRequest.details.dropCoords;
        const polyline = L.polyline(
          [
            [pickup.lat, pickup.lng],
            [drop.lat, drop.lng]
          ],
          { color: '#ef4444', weight: 4, dashArray: '8, 8' }
        ).addTo(map);
        markersRef.current.push(polyline);
      }
    }

    return () => {
      // Map instance cleanup on unmount
    };
  }, [hospitals, ambulances, activeRequest]);

  return (
    <div
      ref={mapRef}
      className="map-container"
      style={{ height, width: '100%', position: 'relative' }}
      aria-label="Real-time emergency logistics and hospital coordinate map"
    />
  );
};
