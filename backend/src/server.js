const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

const { store } = require('./db/store');
const { initSocket } = require('./socket');
const { administrativeSafetyGuard } = require('./middleware/safety');

// Route imports
const authRoutes = require('./routes/auth');
const hospitalRoutes = require('./routes/hospitals');
const appointmentRoutes = require('./routes/appointments');
const ambulanceRoutes = require('./routes/ambulances');
const requestRoutes = require('./routes/requests');
const adminRoutes = require('./routes/admin');
const doctorRoutes = require('./routes/doctor');
const patientRoutes = require('./routes/patients');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

initSocket(io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(administrativeSafetyGuard);

// Global Health & Scope Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'MediLink CARE Backend',
    version: '1.0.0',
    scope: 'Healthcare Coordination & Administrative Management Only (No Diagnosis / No Treatment)',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/hospital', hospitalRoutes); // Alias for PRD routes like /api/hospital/:id
app.use('/api/appointments', appointmentRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`MediLink CARE Backend running on port ${PORT}`);
    console.log(`Safety Scope: Administrative & Logistics Coordination Only`);
    console.log(`Live Socket.io Engine initialized`);
    console.log(`=======================================================`);
  });
}

module.exports = { app, server };
