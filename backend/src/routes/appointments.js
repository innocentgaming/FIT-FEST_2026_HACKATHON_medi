const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const VALID_APPOINTMENT_STATUSES = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

// Get appointments (auto-filtered by role)
router.get('/', authenticateToken, (req, res) => {
  const { status, hospitalId, date } = req.query;
  let appointments = store.get('appointments');

  if (req.user.role === 'PATIENT') {
    appointments = appointments.filter((a) => a.patientId === req.user.id);
  } else if (req.user.role === 'HOSPITAL') {
    appointments = appointments.filter((a) => a.hospitalId === req.user.hospitalId);
  } else if (req.user.role === 'AMBULANCE') {
    // Ambulance drivers don't manage hospital OPD appointments, but can see if explicitly queried
    if (hospitalId) {
      appointments = appointments.filter((a) => a.hospitalId === hospitalId);
    }
  }

  if (status) {
    appointments = appointments.filter((a) => a.status === status.toUpperCase());
  }

  if (hospitalId && req.user.role !== 'HOSPITAL') {
    appointments = appointments.filter((a) => a.hospitalId === hospitalId);
  }

  if (date) {
    appointments = appointments.filter((a) => a.date === date);
  }

  // Sort by date/time descending
  appointments.sort((a, b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`));

  res.json({ appointments, count: appointments.length });
});

// Book appointment (PATIENT, HOSPITAL, or ADMIN)
router.post('/', authenticateToken, requireRole('PATIENT', 'HOSPITAL', 'ADMIN'), (req, res) => {
  const {
    hospitalId,
    patientId,
    patientName,
    patientPhone,
    specialistName,
    specialty,
    date,
    time,
    purpose,
    notes
  } = req.body;

  if (!hospitalId || !date || !time) {
    return res.status(400).json({ error: 'Hospital ID, date, and time are required.' });
  }

  const hospital = store.findById('hospitals', hospitalId);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }

  const assignedPatientId = req.user.role === 'PATIENT' ? req.user.id : (patientId || `walkin_${Date.now()}`);
  const assignedPatientName = req.user.role === 'PATIENT' ? req.user.name : (patientName || 'Walk-in Patient');
  const assignedPatientPhone = req.user.role === 'PATIENT' ? req.user.phone : (patientPhone || '');

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
    date,
    time,
    purpose: sanitizedPurpose,
    status: 'SCHEDULED', // Default status
    notes: notes || 'Administrative scheduling entry.',
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
    details: `Booked appointment with ${hospital.name} on ${date} at ${time}`
  });

  res.status(201).json({
    message: 'Appointment booked successfully',
    appointment: newAppointment
  });
});

// Update appointment status (HOSPITAL, PATIENT, ADMIN)
router.put('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status || !VALID_APPOINTMENT_STATUSES.includes(status.toUpperCase())) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_APPOINTMENT_STATUSES.join(', ')}`
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

  const updates = {
    status: targetStatus,
    notes: notes !== undefined ? notes : appointment.notes
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
  res.json({ appointment });
});

module.exports = router;
