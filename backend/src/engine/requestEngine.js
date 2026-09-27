/**
 * MediLink CARE — Unified Request Engine & Centralized Status Machine
 * Implements strict, conflict-free state lifecycle transitions, RBAC ownership guards,
 * and immutable terminal states across all request types.
 */

const REQUEST_TYPES = {
  PATIENT_ADMISSION: 'PATIENT_ADMISSION',
  HOSPITAL_TRANSFER: 'HOSPITAL_TRANSFER',
  BLOOD_REQUEST: 'BLOOD_REQUEST',
  EQUIPMENT_REQUEST: 'EQUIPMENT_REQUEST',
  AMBULANCE_REQUEST: 'AMBULANCE_REQUEST'
};

const REQUEST_STATUSES = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED'
};

const TERMINAL_STATUSES = [
  REQUEST_STATUSES.COMPLETED,
  REQUEST_STATUSES.RESOLVED,
  REQUEST_STATUSES.CANCELLED
];

// Mapping table for backward compatibility with short-form or alternate keys
const TYPE_ALIAS_MAP = {
  'BED': REQUEST_TYPES.PATIENT_ADMISSION,
  'ICU': REQUEST_TYPES.PATIENT_ADMISSION,
  'ADMISSION': REQUEST_TYPES.PATIENT_ADMISSION,
  'PATIENT_ADMISSION': REQUEST_TYPES.PATIENT_ADMISSION,

  'TRANSFER': REQUEST_TYPES.HOSPITAL_TRANSFER,
  'H2H_TRANSFER': REQUEST_TYPES.HOSPITAL_TRANSFER,
  'HOSPITAL_TRANSFER': REQUEST_TYPES.HOSPITAL_TRANSFER,

  'BLOOD': REQUEST_TYPES.BLOOD_REQUEST,
  'BLOOD_REQUEST': REQUEST_TYPES.BLOOD_REQUEST,

  'EQUIPMENT': REQUEST_TYPES.EQUIPMENT_REQUEST,
  'VENTILATOR': REQUEST_TYPES.EQUIPMENT_REQUEST,
  'OXYGEN': REQUEST_TYPES.EQUIPMENT_REQUEST,
  'EQUIPMENT_REQUEST': REQUEST_TYPES.EQUIPMENT_REQUEST,

  'AMBULANCE': REQUEST_TYPES.AMBULANCE_REQUEST,
  'AMBULANCE_REQUEST': REQUEST_TYPES.AMBULANCE_REQUEST
};

/**
 * Normalizes any input request type to canonical PRD standard
 */
function normalizeRequestType(type) {
  if (!type) return REQUEST_TYPES.PATIENT_ADMISSION;
  const upper = String(type).trim().toUpperCase();
  return TYPE_ALIAS_MAP[upper] || upper;
}

/**
 * Valid transitions graph:
 * PENDING -> ACCEPTED, REJECTED, ASSIGNED
 * ASSIGNED -> ACCEPTED, REJECTED, RESOLVED
 * ACCEPTED -> COMPLETED, REJECTED
 * REJECTED -> ASSIGNED (Admin Triage Escalation)
 */
const ALLOWED_TRANSITIONS = {
  [REQUEST_STATUSES.PENDING]: [
    REQUEST_STATUSES.ACCEPTED,
    REQUEST_STATUSES.REJECTED,
    REQUEST_STATUSES.ASSIGNED
  ],
  [REQUEST_STATUSES.ASSIGNED]: [
    REQUEST_STATUSES.ACCEPTED,
    REQUEST_STATUSES.REJECTED,
    REQUEST_STATUSES.RESOLVED
  ],
  [REQUEST_STATUSES.ACCEPTED]: [
    REQUEST_STATUSES.COMPLETED,
    REQUEST_STATUSES.REJECTED
  ],
  [REQUEST_STATUSES.REJECTED]: [
    REQUEST_STATUSES.ASSIGNED
  ],
  [REQUEST_STATUSES.COMPLETED]: [],
  [REQUEST_STATUSES.RESOLVED]: [],
  [REQUEST_STATUSES.CANCELLED]: []
};

/**
 * Centralized State Machine & RBAC Transition Validator
 */
function validateTransition({
  request,
  targetStatus,
  user,
  responseNotes,
  reason,
  resolutionNotes,
  ambulanceTripStatus,
  assignedDoctorId,
  store
}) {
  if (!request) {
    return { valid: false, statusCode: 404, error: 'Request not found.' };
  }

  const currentStatus = request.status;
  const nextStatus = targetStatus ? targetStatus.toUpperCase() : currentStatus;

  // 1. Check Terminal States: Completed / Resolved / Cancelled cannot be modified
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    return {
      valid: false,
      statusCode: 400,
      error: `Request #${request.id} is in terminal state '${currentStatus}' and cannot be modified.`
    };
  }

  // If status is not changing (e.g., driver updating sub-state like 'On the Way')
  if (currentStatus === nextStatus) {
    if (ambulanceTripStatus) {
      return { valid: true };
    }
    return { valid: true };
  }

  // 2. Validate Allowed Transition Graph
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      statusCode: 400,
      error: `Invalid status transition from '${currentStatus}' to '${nextStatus}'.`
    };
  }

  const noteExplanation = (responseNotes || reason || '').trim();

  // 3. Rejection Reason Guard: Transitioning to REJECTED requires non-empty reason
  if (nextStatus === REQUEST_STATUSES.REJECTED && !noteExplanation) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Rejection requires a mandatory explanation in responseNotes or reason.'
    };
  }

  // 4. Role & Ownership Checks
  if (user) {
    const role = user.role;
    const reqType = normalizeRequestType(request.type);

    // Rule A: Ambulance Acceptance Guard
    if (reqType === REQUEST_TYPES.AMBULANCE_REQUEST && nextStatus === REQUEST_STATUSES.ACCEPTED) {
      if (role === 'AMBULANCE') {
        if (request.assignedAmbulanceId && user.ambulanceId !== request.assignedAmbulanceId) {
          return {
            valid: false,
            statusCode: 403,
            error: "Unauthorized: Driver cannot accept another driver's assigned ambulance request."
          };
        }
      } else if (role !== 'ADMIN') {
        return {
          valid: false,
          statusCode: 403,
          error: 'Only the assigned ambulance driver or admin can accept ambulance dispatch.'
        };
      }
    }

    // Rule B: Hospital Acceptance / Rejection Guard
    if (
      [REQUEST_TYPES.PATIENT_ADMISSION, REQUEST_TYPES.HOSPITAL_TRANSFER, REQUEST_TYPES.BLOOD_REQUEST, REQUEST_TYPES.EQUIPMENT_REQUEST].includes(reqType) &&
      (nextStatus === REQUEST_STATUSES.ACCEPTED || nextStatus === REQUEST_STATUSES.REJECTED) &&
      currentStatus === REQUEST_STATUSES.PENDING
    ) {
      if (role === 'HOSPITAL') {
        const isTarget = request.targetHospitalId && request.targetHospitalId === user.hospitalId;
        const isSource = request.sourceHospitalId && request.sourceHospitalId === user.hospitalId;
        if (!isTarget && !isSource) {
          return {
            valid: false,
            statusCode: 403,
            error: "Unauthorized: Hospital cannot modify another hospital's request."
          };
        }
      } else if (role !== 'ADMIN') {
        return {
          valid: false,
          statusCode: 403,
          error: 'Only the target hospital administrator or system admin can process this request.'
        };
      }
    }

    // Rule C: Escalation Guard (REJECTED -> ASSIGNED)
    if (currentStatus === REQUEST_STATUSES.REJECTED && nextStatus === REQUEST_STATUSES.ASSIGNED) {
      if (role !== 'ADMIN') {
        return {
          valid: false,
          statusCode: 403,
          error: 'Only System Administrators can escalate rejected requests to a System Doctor.'
        };
      }
      if (assignedDoctorId && store) {
        const doctor = store.findById('users', assignedDoctorId);
        if (!doctor || doctor.role !== 'SYSTEM_DOCTOR') {
          return {
            valid: false,
            statusCode: 400,
            error: 'Specified user is not a valid System Doctor for triage assignment.'
          };
        }
      }
    }

    // Rule D: Conflict Resolution Guard (ASSIGNED -> RESOLVED)
    if (nextStatus === REQUEST_STATUSES.RESOLVED) {
      if (role !== 'SYSTEM_DOCTOR' && role !== 'ADMIN') {
        return {
          valid: false,
          statusCode: 403,
          error: 'Only an authorized System Doctor can resolve an escalated conflict.'
        };
      }

      if (role === 'SYSTEM_DOCTOR' && request.assignedDoctorId && request.assignedDoctorId !== user.id) {
        return {
          valid: false,
          statusCode: 403,
          error: "Unauthorized: Doctor cannot resolve another doctor's assigned request."
        };
      }

      const resNotes = (resolutionNotes || responseNotes || '').trim();
      if (!resNotes) {
        return {
          valid: false,
          statusCode: 400,
          error: 'Comprehensive resolution notes are required to resolve the conflict.'
        };
      }
    }
  }

  return { valid: true };
}

module.exports = {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  TERMINAL_STATUSES,
  ALLOWED_TRANSITIONS,
  normalizeRequestType,
  validateTransition
};
