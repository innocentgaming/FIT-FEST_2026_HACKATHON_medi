const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const VALID_APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'FOLLOW_UP'
];

// Get appointments with breakdown analytics and role-based filtering
router.get('/', authenticateToken, (req, res) => {
  const { status, hospitalId, date, filter } = req.query;
  let appointments = store.get('appointments');

  // Role-Based Filtering
  if (req.user.role === 'PATIENT') {
    appointments = appointments.filter((a) => a.patientId === req.user.id);
  } else if (req.user.role === 'HOSPITAL') {
    appointments = appointments.filter((a) => a.hospitalId === req.user.hospitalId);
  } else if (req.user.role === 'AMBULANCE') {
    if (hospitalId) {
      appointments = appointments.filter((a) => a.hospitalId === hospitalId);
    }
  }
  // Admin and Doctor can view all or filter by hospitalId

  if (hospitalId && req.user.role !== 'HOSPITAL') {
    appointments = appointments.filter((a) => a.hospitalId === hospitalId);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Summary Metrics Breakdown
  const summary = {
    total: appointments.length,
    today: appointments.filter((a) => (a.appointmentDate || a.date) === todayStr && ['SCHEDULED', 'CONFIRMED'].includes(a.status)).length,
    upcoming: appointments.filter((a) => (a.appointmentDate || a.date) >= todayStr && ['SCHEDULED', 'CONFIRMED'].includes(a.status)).length,
    completed: appointments.filter((a) => a.status === 'COMPLETED').length,
    cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
    noShow: appointments.filter((a) => a.status === 'NO_SHOW').length,
    followUp: appointments.filter((a) => a.status === 'FOLLOW_UP').length
  };

  // Filter types
  if (filter) {
    const f = filter.toLowerCase();
    if (f === 'today') {
      appointments = appointments.filter((a) => (a.appointmentDate || a.date) === todayStr);
    } else if (f === 'upcoming') {
      appointments = appointments.filter((a) => (a.appointmentDate || a.date) >= todayStr && ['SCHEDULED', 'CONFIRMED'].includes(a.status));
    } else if (f === 'completed') {
      appointments = appointments.filter((a) => a.status === 'COMPLETED');
    } else if (f === 'cancelled') {
      appointments = appointments.filter((a) => a.status === 'CANCELLED');
    } else if (f === 'no_show' || f === 'noshow') {
      appointments = appointments.filter((a) => a.status === 'NO_SHOW');
    } else if (f === 'follow_up' || f === 'followup') {
      appointments = appointments.filter((a) => a.status === 'FOLLOW_UP');
    }
  }

  if (status) {
    appointments = appointments.filter((a) => a.status === status.toUpperCase());
  }

  if (date) {
    appointments = appointments.filter((a) => (a.appointmentDate || a.date) === date);
  }

  // Sort by appointment date and time
  appointments.sort((a, b) => {
    const dateA = a.appointmentDate || a.date;
    const dateB = b.appointmentDate || b.date;
    const timeA = a.appointmentTime || a.time;
    const timeB = b.appointmentTime || b.time;
    return new Date(`${dateB} ${timeB}`) - new Date(`${dateA} ${timeA}`);
  });

  res.json({
    summary,
    appointments,
    count: appointments.length
  });
});

// Book appointment with duplicate & past date validation
router.post('/', authenticateToken, requireRole('PATIENT', 'HOSPITAL', 'ADMIN'), (req, res) => {
  const {
    hospitalId,
    patientId,
    patientName,
    patientPhone,
    specialistName,
    specialty,
    appointmentDate,
    appointmentTime,
    date,
    time,
    purpose,
    administrativeNotes,
    notes
  } = req.body;

  const targetDate = appointmentDate || date;
  const targetTime = appointmentTime || time;

  if (!hospitalId || !targetDate || !targetTime) {
    return res.status(400).json({ error: 'Hospital ID, appointment date, and time are required.' });
  }

  const hospital = store.findById('hospitals', hospitalId);
  if (!hospital) {
    return res.status(404).json({ error: 'Healthcare facility not found.' });
  }

  // 1. Prevent past date bookings
  const todayStr = new Date().toISOString().split('T')[0];
  if (targetDate < todayStr) {
    return res.status(400).json({
      error: `Invalid date: Cannot book appointments for past dates (${targetDate}). Today is ${todayStr}.`
    });
  }

  const assignedPatientId = req.user.role === 'PATIENT' ? req.user.id : (patientId || `walkin_${Date.now()}`);
  const assignedPatientName = req.user.role === 'PATIENT' ? req.user.name : (patientName || 'Walk-in Patient');
  const assignedPatientPhone = req.user.role === 'PATIENT' ? req.user.phone : (patientPhone || '');

  // 2. Prevent Duplicate Booking
  const existing = store.findWhere('appointments', (a) =>
    a.patientId === assignedPatientId &&
    a.hospitalId === hospitalId &&
    (a.appointmentDate || a.date) === targetDate &&
    (a.appointmentTime || a.time) === targetTime &&
    ['SCHEDULED', 'CONFIRMED'].includes(a.status)
  );

  if (existing && existing.length > 0) {
    return res.status(400).json({
      error: `Duplicate booking detected: You already have an active appointment (#${existing[0].id}) at ${hospital.name} on ${targetDate} at ${targetTime}.`
    });
  }

  // 3. Slot capacity check (Max 5 patients per specialist time slot)
  const slotCount = store.findWhere('appointments', (a) =>
    a.hospitalId === hospitalId &&
    (a.appointmentDate || a.date) === targetDate &&
    (a.appointmentTime || a.time) === targetTime &&
    ['SCHEDULED', 'CONFIRMED'].includes(a.status)
  ).length;

  if (slotCount >= 5) {
    return res.status(400).json({
      error: `Slot capacity reached for ${targetTime} on ${targetDate}. Please select another time slot.`
    });
  }

  // Administrative purpose only
  const sanitizedPurpose = purpose || 'Administrative OPD Registration';

  const newAppointment = {
    id: `apt_${Date.now()}`,
    patientId: assignedPatientId,
    patientName: assignedPatientName,
    patientPhone: assignedPatientPhone,
    hospitalId,
    hospitalName: hospital.name,
    specialistName: specialistName || 'General OPD Desk',
    specialty: specialty || 'General Medicine',
    appointmentDate: targetDate,
    appointmentTime: targetTime,
    date: targetDate,
    time: targetTime,
    purpose: sanitizedPurpose,
    status: 'SCHEDULED',
    administrativeNotes: administrativeNotes || notes || 'Administrative scheduling entry.',
    notes: administrativeNotes || notes || 'Administrative scheduling entry.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.insert('appointments', newAppointment);

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'BOOK_APPOINTMENT',
    resourceType: 'APPOINTMENT',
    resourceId: newAppointment.id,
    details: `Booked appointment with ${hospital.name} on ${targetDate} at ${targetTime}`
  });

  res.status(201).json({
    message: 'Appointment booked successfully',
    appointment: newAppointment
  });
});

// Update appointment status (HOSPITAL, PATIENT, ADMIN)
router.put('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, administrativeNotes, notes } = req.body;

  if (!status || !VALID_APPOINTMENT_STATUSES.includes(status.toUpperCase())) {
    return res.status(400).json({
      error: `Invalid status '${status}'. Must be one of: ${VALID_APPOINTMENT_STATUSES.join(', ')}`
    });
  }

  const appointment = store.findById('appointments', id);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  // Authorization check
  if (req.user.role === 'PATIENT' && appointment.patientId !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized to modify another patient appointment.' });
  }

  if (req.user.role === 'HOSPITAL' && appointment.hospitalId !== req.user.hospitalId) {
    return res.status(403).json({ error: 'Unauthorized to modify another hospital appointment.' });
  }

  const targetStatus = status.toUpperCase();

  // Patients can only CANCEL
  if (req.user.role === 'PATIENT' && targetStatus !== 'CANCELLED') {
    return res.status(403).json({ error: 'Patients can only cancel their appointments.' });
  }

  // Block modification on already completed/cancelled
  if (['COMPLETED', 'CANCELLED'].includes(appointment.status) && targetStatus === appointment.status) {
    return res.status(400).json({ error: `Appointment #${id} is already in state ${appointment.status}.` });
  }

  const noteContent = administrativeNotes !== undefined ? administrativeNotes : (notes !== undefined ? notes : appointment.administrativeNotes);

  const updates = {
    status: targetStatus,
    administrativeNotes: noteContent,
    notes: noteContent
  };

  const updated = store.update('appointments', id, updates);

  store.logAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'UPDATE_APPOINTMENT_STATUS',
    resourceType: 'APPOINTMENT',
    resourceId: id,
    details: `Status changed to ${targetStatus}`
  });

  res.json({
    message: `Appointment marked as ${targetStatus}`,
    appointment: updated
  });
});

// Get single appointment
router.get('/:id', authenticateToken, (req, res) => {
  const appointment = store.findById('appointments', req.params.id);
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

  // Ownership check
  if (req.user.role === 'PATIENT' && appointment.patientId !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized: You cannot access another patient appointment.' });
  }

  if (req.user.role === 'HOSPITAL' && appointment.hospitalId !== req.user.hospitalId) {
    return res.status(403).json({ error: 'Unauthorized: Appointment belongs to another hospital.' });
  }

  res.json({ appointment });
});

module.exports = router;
