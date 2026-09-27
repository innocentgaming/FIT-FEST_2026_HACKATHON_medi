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

  useEffect(() => {
    // Connect to Socket.io server
    const newSocket = io({
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('⚡ Connected to MediLink Socket.io Server');
    });

    newSocket.on('notification', (data) => {
      addToast(data);
    });

    newSocket.on('resource_updated', (data) => {
      setLiveResourceUpdate(data);
    });

    newSocket.on('bloodbank_updated', (data) => {
      setLiveBloodBankUpdate(data);
    });

    newSocket.on('ambulance_location_updated', (data) => {
      setLiveLocationUpdate(data);
    });

    newSocket.on('request_updated', (data) => {
      setLiveRequestUpdate(data);
    });

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
        liveRequestUpdate
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
