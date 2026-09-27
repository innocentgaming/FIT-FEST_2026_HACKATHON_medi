const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('medilink_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

export const api = {
  // Auth
  login: (credentials) =>
    fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(handleResponse),

  registerPatient: (data) =>
    fetch(`${API_BASE}/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  registerAmbulance: (data) =>
    fetch(`${API_BASE}/ambulance/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  registerHospital: (data) =>
    fetch(`${API_BASE}/hospital/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  getMe: () =>
    fetch(`${API_BASE}/me`, {
      headers: getHeaders()
    }).then(handleResponse),

  getDemoAccounts: () =>
    fetch(`${API_BASE}/demo-accounts`).then(handleResponse),

  // Hospitals & Resources
  getHospitals: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/hospitals?${query}`, {
      headers: getHeaders()
    }).then(handleResponse);
  },

  getHospitalById: (id) =>
    fetch(`${API_BASE}/hospital/${id}`, {
      headers: getHeaders()
    }).then(handleResponse),

  getHospitalSummary: (id) =>
    fetch(`${API_BASE}/hospital/${id}/dashboard-summary`, {
      headers: getHeaders()
    }).then(handleResponse),

  updateHospitalResources: (id, resources) =>
    fetch(`${API_BASE}/hospital/${id}/resources`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(resources)
    }).then(handleResponse),

  updateHospitalBloodBank: (id, bloodBank) =>
    fetch(`${API_BASE}/hospital/${id}/bloodbank`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(bloodBank)
    }).then(handleResponse),

  addSpecialist: (hospitalId, specialist) =>
    fetch(`${API_BASE}/hospital/${hospitalId}/specialists`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(specialist)
    }).then(handleResponse),

  deleteSpecialist: (hospitalId, specialistId) =>
    fetch(`${API_BASE}/hospital/${hospitalId}/specialists/${specialistId}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  // Appointments
  getAppointments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/appointments?${query}`, {
      headers: getHeaders()
    }).then(handleResponse);
  },

  bookAppointment: (data) =>
    fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateAppointmentStatus: (id, status, notes) =>
    fetch(`${API_BASE}/appointments/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, notes })
    }).then(handleResponse),

  // Ambulances
  getAmbulances: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/ambulance?${query}`, {
      headers: getHeaders()
    }).then(handleResponse);
  },

  updateAmbulanceStatus: (id, status) =>
    fetch(`${API_BASE}/ambulance/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    }).then(handleResponse),

  updateAmbulanceLocation: (id, location) =>
    fetch(`${API_BASE}/ambulance/${id}/location`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(location)
    }).then(handleResponse),

  // Unified Requests
  getRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/requests?${query}`, {
      headers: getHeaders()
    }).then(handleResponse);
  },

  createRequest: (data) =>
    fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateRequestStatus: (id, data) =>
    fetch(`${API_BASE}/requests/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  searchBlood: (query) =>
    fetch(`${API_BASE}/requests/search-blood`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(query)
    }).then(handleResponse),

  // Admin
  getAdminHospitals: () =>
    fetch(`${API_BASE}/admin/hospitals`, {
      headers: getHeaders()
    }).then(handleResponse),

  getSystemDoctors: () =>
    fetch(`${API_BASE}/admin/system-doctors`, {
      headers: getHeaders()
    }).then(handleResponse),

  getAdminRequests: () =>
    fetch(`${API_BASE}/admin/patient-requests`, {
      headers: getHeaders()
    }).then(handleResponse),

  assignRequestToDoctor: (requestId, doctorId, triageNotes) =>
    fetch(`${API_BASE}/admin/requests/${requestId}/assign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ doctorId, triageNotes })
    }).then(handleResponse),

  getAuditLogs: (limit = 100) =>
    fetch(`${API_BASE}/admin/audit-logs?limit=${limit}`, {
      headers: getHeaders()
    }).then(handleResponse),

  resetDemoData: () =>
    fetch(`${API_BASE}/admin/reset-demo`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),

  // System Doctor
  getDoctorAssignedRequests: () =>
    fetch(`${API_BASE}/doctor/assigned-requests`, {
      headers: getHeaders()
    }).then(handleResponse),

  resolveDoctorConflict: (requestId, data) =>
    fetch(`${API_BASE}/doctor/requests/${requestId}/resolve`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  // Patient Record
  getPatientProfile: (id) =>
    fetch(`${API_BASE}/patient/${id}`, {
      headers: getHeaders()
    }).then(handleResponse),

  updatePatientProfile: (id, data) =>
    fetch(`${API_BASE}/patient/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse)
};
