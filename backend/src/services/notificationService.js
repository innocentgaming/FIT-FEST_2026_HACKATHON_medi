/**
 * MediLink CARE — Centralized Notification Service
 * Manages notification generation, persistence, role/user dispatch,
 * and Socket.io real-time streaming. Strictly excludes clinical diagnostic advice.
 */

const { store } = require('../db/store');
const { getIO } = require('../socket');

const NOTIFICATION_TYPES = {
  APPOINTMENT_UPDATE: 'APPOINTMENT_UPDATE',
  ADMISSION_REQUEST: 'ADMISSION_REQUEST',
  TRANSFER_REQUEST: 'TRANSFER_REQUEST',
  AMBULANCE_REQUEST: 'AMBULANCE_REQUEST',
  AMBULANCE_ASSIGNMENT: 'AMBULANCE_ASSIGNMENT',
  AMBULANCE_STATUS: 'AMBULANCE_STATUS',
  BLOOD_REQUEST_RESULT: 'BLOOD_REQUEST_RESULT',
  RESOURCE_CHANGE: 'RESOURCE_CHANGE',
  CONFLICT_ASSIGNMENT: 'CONFLICT_ASSIGNMENT',
  CONFLICT_RESOLUTION: 'CONFLICT_RESOLUTION',
  SYSTEM_ALERT: 'SYSTEM_ALERT'
};

/**
 * Creates and stores a notification record and pushes to recipient's socket room
 */
function createNotification({ userId, type, title, message, metadata = {} }) {
  if (!userId) return null;

  const notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    type: type || NOTIFICATION_TYPES.SYSTEM_ALERT,
    title: title || 'Notification',
    message: message || '',
    read: false,
    metadata,
    createdAt: new Date().toISOString()
  };

  store.insert('notifications', notification);

  const io = getIO();
  if (io) {
    // Standard event: notification:new (also legacy 'notification')
    io.to(`user_${userId}`).emit('notification:new', notification);
    io.to(`user_${userId}`).emit('notification', notification);
  }

  return notification;
}

/**
 * Broadcasts a notification to all users matching a specific role
 */
function createRoleNotification({ role, type, title, message, metadata = {} }) {
  const users = store.get('users').filter((u) => u.role === role);
  const notifications = users.map((u) =>
    createNotification({ userId: u.id, type, title, message, metadata })
  );

  const io = getIO();
  if (io) {
    io.to(`role_${role}`).emit('notification:new', {
      type,
      title,
      message,
      metadata,
      createdAt: new Date().toISOString()
    });
  }

  return notifications;
}

/**
 * Generates notification for appointment status changes
 */
function notifyAppointmentUpdate(appointment) {
  if (appointment.patientId) {
    createNotification({
      userId: appointment.patientId,
      type: NOTIFICATION_TYPES.APPOINTMENT_UPDATE,
      title: `Appointment Status: ${appointment.status}`,
      message: `Your appointment with ${appointment.hospitalName || 'the healthcare facility'} for department '${appointment.department || 'General'}' is now ${appointment.status}.`,
      metadata: { appointmentId: appointment.id, status: appointment.status }
    });
  }
}

/**
 * Generates notification for Patient Admission Request
 */
function notifyAdmissionRequest(request) {
  if (request.patientId) {
    createNotification({
      userId: request.patientId,
      type: NOTIFICATION_TYPES.ADMISSION_REQUEST,
      title: `Admission Request: ${request.status}`,
      message: `Your admission request for ${request.targetHospitalName || 'hospital'} is now ${request.status}.`,
      metadata: { requestId: request.id, status: request.status }
    });
  }
}

/**
 * Generates notification for Hospital-to-Hospital Transfer Request
 */
function notifyTransferRequest(request) {
  if (request.patientId) {
    createNotification({
      userId: request.patientId,
      type: NOTIFICATION_TYPES.TRANSFER_REQUEST,
      title: `Facility Transfer Update: ${request.status}`,
      message: `Transfer coordination to ${request.targetHospitalName || 'destination facility'} is currently ${request.status}.`,
      metadata: { requestId: request.id, status: request.status }
    });
  }
}

/**
 * Generates notification for Ambulance Requests & Assignments
 */
function notifyAmbulanceEvent(request, eventType) {
  // Notify Patient
  if (request.patientId) {
    let msg = `Your ambulance request #${request.id} is now ${request.status}.`;
    if (request.status === 'ASSIGNED' && request.assignedAmbulanceVehicle) {
      msg = `Ambulance unit ${request.assignedAmbulanceVehicle} has been assigned to your location.`;
    } else if (request.status === 'ACCEPTED') {
      msg = `Driver accepted your dispatch and is currently on the way.`;
    } else if (request.status === 'COMPLETED') {
      msg = `Emergency trip #${request.id} has been safely completed.`;
    }

    createNotification({
      userId: request.patientId,
      type: NOTIFICATION_TYPES.AMBULANCE_STATUS,
      title: `Ambulance Dispatch: ${request.status}`,
      message: msg,
      metadata: { requestId: request.id, status: request.status, vehicle: request.assignedAmbulanceVehicle }
    });
  }

  // Notify Assigned Driver
  if (request.assignedAmbulanceId) {
    const ambulance = store.findById('ambulances', request.assignedAmbulanceId);
    if (ambulance && ambulance.driverUserId) {
      createNotification({
        userId: ambulance.driverUserId,
        type: NOTIFICATION_TYPES.AMBULANCE_ASSIGNMENT,
        title: `Dispatch Update: ${request.status}`,
        message: `Trip for patient ${request.patientName || 'Emergency'} is now ${request.status}.`,
        metadata: { requestId: request.id, status: request.status }
      });
    }
  }
}

/**
 * Generates notification for Blood Requisition results
 */
function notifyBloodRequest(request) {
  if (request.patientId) {
    createNotification({
      userId: request.patientId,
      type: NOTIFICATION_TYPES.BLOOD_REQUEST_RESULT,
      title: `Blood Requisition: ${request.status}`,
      message: `Blood bank requisition for ${request.details?.bloodGroup || 'requested group'} at ${request.targetHospitalName || 'facility'} is now ${request.status}.`,
      metadata: { requestId: request.id, status: request.status }
    });
  }
}

/**
 * Generates notification for Resource Level changes (e.g. ICU bed thresholds)
 */
function notifyResourceChange(hospitalId, resourceType, availableCount) {
  const hospital = store.findById('hospitals', hospitalId);
  const hospName = hospital ? hospital.name : 'Facility';

  createRoleNotification({
    role: 'ADMIN',
    type: NOTIFICATION_TYPES.RESOURCE_CHANGE,
    title: `Resource Telemetry Update`,
    message: `${hospName} updated ${resourceType} inventory. Current available: ${availableCount}.`,
    metadata: { hospitalId, resourceType, availableCount }
  });
}

/**
 * Generates notification when an Admin escalates a conflict to a System Doctor
 */
function notifyConflictAssignment(request, doctorId) {
  createNotification({
    userId: doctorId,
    type: NOTIFICATION_TYPES.CONFLICT_ASSIGNMENT,
    title: `⚖️ Conflict Resolution Assigned`,
    message: `Admin assigned rejected request #${request.id} for patient ${request.patientName || 'Emergency'} to you for alternative facility coordination.`,
    metadata: { requestId: request.id }
  });
}

/**
 * Generates notification when a System Doctor resolves a conflict
 */
function notifyConflictResolution(request) {
  if (request.patientId) {
    createNotification({
      userId: request.patientId,
      type: NOTIFICATION_TYPES.CONFLICT_RESOLUTION,
      title: `Healthcare Request Resolved`,
      message: `Your healthcare coordination request has been resolved. Please review the updated facility information.`,
      metadata: { requestId: request.id, targetHospitalName: request.targetHospitalName }
    });
  }
}

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  createRoleNotification,
  notifyAppointmentUpdate,
  notifyAdmissionRequest,
  notifyTransferRequest,
  notifyAmbulanceEvent,
  notifyBloodRequest,
  notifyResourceChange,
  notifyConflictAssignment,
  notifyConflictResolution
};
