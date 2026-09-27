import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [liveLocationUpdate, setLiveLocationUpdate] = useState(null);
  const [liveResourceUpdate, setLiveResourceUpdate] = useState(null);
  const [liveBloodBankUpdate, setLiveBloodBankUpdate] = useState(null);
  const [liveRequestUpdate, setLiveRequestUpdate] = useState(null);
  const [liveAppointmentUpdate, setLiveAppointmentUpdate] = useState(null);

  useEffect(() => {
    // Connect to Socket.io server (supports custom host or same-origin)
    const socketEndpoint = import.meta.env.VITE_SOCKET_URL || undefined;
    const newSocket = io(socketEndpoint, {
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('⚡ Connected to MediLink Socket.io Server');
    });

    // Standardized Phase 8 event + legacy support
    const handleNotification = (data) => {
      addToast(data);
    };
    newSocket.on('notification', handleNotification);
    newSocket.on('notification:new', handleNotification);

    const handleResource = (data) => {
      setLiveResourceUpdate(data);
    };
    newSocket.on('resource:update', handleResource);
    newSocket.on('resource_updated', handleResource);

    const handleBlood = (data) => {
      setLiveBloodBankUpdate(data);
    };
    newSocket.on('blood:update', handleBlood);
    newSocket.on('bloodbank_updated', handleBlood);

    const handleAmbulanceLocation = (data) => {
      setLiveLocationUpdate(data);
    };
    newSocket.on('ambulance:location', handleAmbulanceLocation);
    newSocket.on('ambulance_location_updated', handleAmbulanceLocation);

    const handleRequest = (data) => {
      setLiveRequestUpdate(data);
    };
    newSocket.on('request:update', handleRequest);
    newSocket.on('request:create', handleRequest);
    newSocket.on('request_updated', handleRequest);
    newSocket.on('request_created', handleRequest);

    const handleAppointment = (data) => {
      setLiveAppointmentUpdate(data);
    };
    newSocket.on('appointment:update', handleAppointment);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // When user logs in or role changes, join appropriate rooms
  useEffect(() => {
    if (socket && user) {
      socket.emit('join_room', {
        role: user.role,
        userId: user.id,
        hospitalId: user.hospitalId,
        ambulanceId: user.ambulanceId
      });
    }
  }, [socket, user]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast, timestamp: new Date() };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));

    // Auto remove after 6 seconds
    setTimeout(() => {
      removeToast(id);
    }, 6000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        toasts,
        addToast,
        removeToast,
        liveLocationUpdate,
        liveResourceUpdate,
        liveBloodBankUpdate,
        liveRequestUpdate,
        liveAppointmentUpdate
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
