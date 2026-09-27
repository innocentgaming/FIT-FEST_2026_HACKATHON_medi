let ioInstance = null;

/**
 * Sanitizes request object for global broadcast to prevent exposing private patient data
 */
function sanitizeRequestForGlobalBroadcast(req) {
  if (!req) return null;
  return {
    id: req.id,
    type: req.type,
    status: req.status,
    priority: req.priority,
    targetHospitalId: req.targetHospitalId,
    targetHospitalName: req.targetHospitalName,
    sourceHospitalId: req.sourceHospitalId,
    sourceHospitalName: req.sourceHospitalName,
    assignedAmbulanceId: req.assignedAmbulanceId,
    assignedAmbulanceVehicle: req.assignedAmbulanceVehicle,
    ambulanceTripStatus: req.ambulanceTripStatus,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt
    // Exclude patientName, patientPhone, medical notes from global broadcast
  };
}

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    // Client joins role-specific or user-specific room
    socket.on('join_room', ({ role, userId, hospitalId, ambulanceId }) => {
      if (role) socket.join(`role_${role}`);
      if (userId) socket.join(`user_${userId}`);
      if (hospitalId) socket.join(`hospital_${hospitalId}`);
      if (ambulanceId) socket.join(`ambulance_${ambulanceId}`);
    });

    // Handle ambulance live GPS simulation streaming from driver
    socket.on('ambulance_gps_update', (data) => {
      broadcastAmbulanceLocation(data);
    });

    socket.on('ambulance:location:send', (data) => {
      broadcastAmbulanceLocation(data);
    });

    socket.on('disconnect', () => {
      // handle disconnect cleanly
    });
  });

  return io;
};

const getIO = () => {
  return ioInstance;
};

// Notification and broadcast helpers with Phase 8 standardized names + legacy aliases
const broadcastResourceUpdate = (hospitalId, resources) => {
  if (!ioInstance) return;
  const payload = { hospitalId, resources, timestamp: new Date().toISOString() };
  ioInstance.emit('resource:update', payload);
  ioInstance.emit('resource_updated', payload);
};

const broadcastBloodBankUpdate = (hospitalId, bloodBank) => {
  if (!ioInstance) return;
  const payload = { hospitalId, bloodBank, timestamp: new Date().toISOString() };
  ioInstance.emit('blood:update', payload);
  ioInstance.emit('bloodbank:updated', payload);
  ioInstance.emit('bloodbank_updated', payload);
};

const broadcastAppointmentUpdate = (appointment) => {
  if (!ioInstance) return;
  // Global sanitized event
  ioInstance.emit('appointment:update', {
    id: appointment.id,
    hospitalId: appointment.hospitalId,
    department: appointment.department,
    status: appointment.status,
    updatedAt: new Date().toISOString()
  });

  // Targeted update to patient
  if (appointment.patientId) {
    ioInstance.to(`user_${appointment.patientId}`).emit('appointment:update', appointment);
  }
  // Targeted update to hospital
  if (appointment.hospitalId) {
    ioInstance.to(`hospital_${appointment.hospitalId}`).emit('appointment:update', appointment);
  }
};

const broadcastAmbulanceStatus = (ambulance) => {
  if (!ioInstance) return;
  ioInstance.emit('ambulance:update', ambulance);
  ioInstance.emit('ambulance_status_updated', ambulance);
  ioInstance.emit('ambulance:status', ambulance);
};

const broadcastAmbulanceLocation = (locationData) => {
  if (!ioInstance) return;
  ioInstance.emit('ambulance:location', locationData);
  ioInstance.emit('ambulance_location_updated', locationData);
};

const broadcastRequestCreated = (request) => {
  if (!ioInstance) return;
  const sanitized = sanitizeRequestForGlobalBroadcast(request);
  ioInstance.emit('request:create', sanitized);
  ioInstance.emit('request_created', sanitized);

  // Targeted full payloads to authorized stakeholders
  if (request.patientId) {
    ioInstance.to(`user_${request.patientId}`).emit('request:create', request);
  }
  if (request.targetHospitalId) {
    ioInstance.to(`hospital_${request.targetHospitalId}`).emit('request:create', request);
  }
  if (request.assignedAmbulanceId) {
    ioInstance.to(`ambulance_${request.assignedAmbulanceId}`).emit('request:create', request);
  }
};

const broadcastRequestStatusChange = (request) => {
  if (!ioInstance) return;
  const sanitized = sanitizeRequestForGlobalBroadcast(request);

  // Global standardized event (sanitized for privacy)
  ioInstance.emit('request:update', sanitized);
  ioInstance.emit('request_updated', sanitized);

  // Targeted rooms receive full details
  if (request.patientId) {
    ioInstance.to(`user_${request.patientId}`).emit('request:update', request);
  }
  if (request.targetHospitalId) {
    ioInstance.to(`hospital_${request.targetHospitalId}`).emit('request:update', request);
  }
  if (request.sourceHospitalId) {
    ioInstance.to(`hospital_${request.sourceHospitalId}`).emit('request:update', request);
  }
  if (request.assignedAmbulanceId) {
    ioInstance.to(`ambulance_${request.assignedAmbulanceId}`).emit('request:update', request);
  }
  if (request.assignedDoctorId) {
    ioInstance.to(`user_${request.assignedDoctorId}`).emit('request:update', request);
  }
  if (request.status === 'REJECTED') {
    ioInstance.to('role_ADMIN').emit('request:update', request);
  }
};

const broadcastEmergencyAlert = (emergencyData) => {
  if (!ioInstance) return;
  ioInstance.emit('emergency:alert', emergencyData);
  ioInstance.emit('emergency_alert_created', emergencyData);
};

module.exports = {
  initSocket,
  getIO,
  sanitizeRequestForGlobalBroadcast,
  broadcastResourceUpdate,
  broadcastBloodBankUpdate,
  broadcastAppointmentUpdate,
  broadcastAmbulanceStatus,
  broadcastAmbulanceLocation,
  broadcastRequestCreated,
  broadcastRequestStatusChange,
  broadcastEmergencyAlert
};
