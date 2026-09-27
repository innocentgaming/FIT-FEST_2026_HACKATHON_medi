let ioInstance = null;

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
      // Broadcast live GPS update to all listeners (especially tracking patients and admins)
      io.emit('ambulance_location_updated', data);
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

// Notification and broadcast helpers
const broadcastResourceUpdate = (hospitalId, resources) => {
  if (!ioInstance) return;
  ioInstance.emit('resource_updated', { hospitalId, resources, timestamp: new Date().toISOString() });
};

const broadcastBloodBankUpdate = (hospitalId, bloodBank) => {
  if (!ioInstance) return;
  ioInstance.emit('bloodbank_updated', { hospitalId, bloodBank, timestamp: new Date().toISOString() });
};

const broadcastAmbulanceStatus = (ambulance) => {
  if (!ioInstance) return;
  ioInstance.emit('ambulance_status_updated', ambulance);
};

const broadcastAmbulanceLocation = (locationData) => {
  if (!ioInstance) return;
  ioInstance.emit('ambulance_location_updated', locationData);
};

const broadcastRequestStatusChange = (request) => {
  if (!ioInstance) return;
  // Emit to all listeners & targeted rooms
  ioInstance.emit('request_updated', request);
  if (request.patientId) {
    ioInstance.to(`user_${request.patientId}`).emit('notification', {
      type: 'REQUEST_UPDATE',
      title: `Request Status: ${request.status}`,
      message: `Your ${request.type} request #${request.id} is now ${request.status}.`,
      request
    });
  }
  if (request.targetHospitalId) {
    ioInstance.to(`hospital_${request.targetHospitalId}`).emit('notification', {
      type: 'HOSPITAL_REQUEST',
      title: `Hospital Request Update (${request.type})`,
      message: `Request #${request.id} status changed to ${request.status}.`,
      request
    });
  }
  if (request.assignedAmbulanceId) {
    ioInstance.to(`ambulance_${request.assignedAmbulanceId}`).emit('notification', {
      type: 'AMBULANCE_DISPATCH',
      title: `Ambulance Dispatch Update`,
      message: `Dispatch #${request.id} updated to ${request.status}.`,
      request
    });
  }
  if (request.status === 'REJECTED') {
    // Notify Admins for escalation queue
    ioInstance.to('role_ADMIN').emit('notification', {
      type: 'ESCALATION_ALERT',
      title: '🚨 Unresolved / Rejected Emergency Request',
      message: `Request #${request.id} was REJECTED by ${request.targetHospitalName || 'facility'}. Triage required.`,
      request
    });
  }
  if (request.status === 'ASSIGNED' && request.assignedDoctorId) {
    // Notify System Doctor
    ioInstance.to(`user_${request.assignedDoctorId}`).emit('notification', {
      type: 'DOCTOR_CONFLICT_ASSIGNMENT',
      title: '⚖️ Conflict Resolution Assigned',
      message: `Admin assigned rejected request #${request.id} to you for alternative facility coordination.`,
      request
    });
  }
};

const broadcastEmergencyAlert = (emergencyData) => {
  if (!ioInstance) return;
  ioInstance.emit('emergency_alert_created', emergencyData);
};

module.exports = {
  initSocket,
  getIO,
  broadcastResourceUpdate,
  broadcastBloodBankUpdate,
  broadcastAmbulanceStatus,
  broadcastAmbulanceLocation,
  broadcastRequestStatusChange,
  broadcastEmergencyAlert
};
