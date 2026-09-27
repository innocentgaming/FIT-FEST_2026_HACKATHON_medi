const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
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
app.disable('x-powered-by');
const server = http.createServer(app);

// Production-grade CORS configuration
const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.CLIENT_ORIGIN || '*';
const allowedOrigins = rawOrigins === '*' ? '*' : rawOrigins.split(',').map((s) => s.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins === '*' || (Array.isArray(allowedOrigins) && (allowedOrigins.includes(origin) || allowedOrigins.includes('*')))) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Initialize Socket.io with configured CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

initSocket(io);

const { securityHeaders } = require('./middleware/securityHeaders');

// Middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(administrativeSafetyGuard);

// Root Health Endpoint for Cloud Run / Load Balancer Healthchecks
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'MediLink CARE',
    timestamp: new Date().toISOString()
  });
});

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

// Static Frontend SPA Serving for Production Docker / Cloud Run
const publicPath = path.join(__dirname, '../public');
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Error Handling Middleware (No Stack Traces or Database Internals Leaked)
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = statusCode >= 500 && isProduction
    ? 'An internal error occurred. Please contact system administrator.'
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    error: errorMessage
  });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(`MediLink CARE Platform running on http://${HOST}:${PORT}`);
    console.log(`Safety Scope: Administrative & Logistics Coordination Only`);
    console.log(`Live Socket.io Engine initialized`);
    console.log(`=======================================================`);
  });
}

module.exports = { app, server };
