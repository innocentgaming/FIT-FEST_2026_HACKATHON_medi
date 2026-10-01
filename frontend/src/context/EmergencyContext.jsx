import React, { createContext, useContext, useState } from 'react';
import { api } from '../services/api';
import { useSocket } from './SocketContext';

const EmergencyContext = createContext(null);

export const EmergencyProvider = ({ children }) => {
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [activeEmergencyRequest, setActiveEmergencyRequest] = useState(null);
  const [emergencyTab, setEmergencyTab] = useState('AMBULANCE'); // AMBULANCE, BLOOD, FACILITIES, STATUS
  const { addToast } = useSocket() || {};

  const openEmergencyMode = (tab = 'AMBULANCE') => {
    setEmergencyTab(tab);
    setIsEmergencyModalOpen(true);
  };

  const closeEmergencyMode = () => {
    setIsEmergencyModalOpen(false);
  };

  const submitQuickAmbulance = async (ambulanceData) => {
    try {
      const res = await api.createRequest({
        type: 'AMBULANCE',
        targetHospitalId: ambulanceData.hospitalId || 'hosp_ruby_hall',
        assignedAmbulanceId: ambulanceData.ambulanceId || 'amb_pune_101',
        priority: 'EMERGENCY',
        details: {
          pickupLocation: ambulanceData.pickupLocation || 'Current GPS Location, Pune',
          pickupCoords: ambulanceData.pickupCoords || { lat: 18.5204, lng: 73.8567 },
          dropLocation: ambulanceData.dropLocation || 'Ruby Hall Clinic Emergency Gate',
          emergencyType: ambulanceData.emergencyType || 'Critical Emergency Pickup',
          requiresOxygen: !!ambulanceData.requiresOxygen,
          emergencyContact: ambulanceData.emergencyContact || 'Family Guardian',
          notifyFamily: ambulanceData.notifyFamily !== false
        }
      });

      setActiveEmergencyRequest(res.request);
      setEmergencyTab('STATUS');

      if (addToast) {
        addToast({
          type: 'EMERGENCY_DISPATCH',
          title: '🚨 Emergency Ambulance Dispatched',
          message: `Request #${res.request.id} broadcasted. Unit assigned.`
        });

        if (ambulanceData.notifyFamily !== false) {
          addToast({
            type: 'SYSTEM_NOTIFICATION',
            title: '👨‍👩‍👧 Family Guardian Alerted',
            message: `Instant SMS & Live GPS tracking sent to ${ambulanceData.emergencyContact || 'Family Contact'}.`
          });
        }
      }

      return res.request;
    } catch (err) {
      console.error('Error submitting quick ambulance:', err);
      throw err;
    }
  };

  return (
    <EmergencyContext.Provider
      value={{
        isEmergencyModalOpen,
        openEmergencyMode,
        closeEmergencyMode,
        emergencyTab,
        setEmergencyTab,
        activeEmergencyRequest,
        setActiveEmergencyRequest,
        submitQuickAmbulance
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = () => useContext(EmergencyContext);
