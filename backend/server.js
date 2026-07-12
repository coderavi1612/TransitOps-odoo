require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Services — each imported from its own folder
const authRoutes = require('./services/auth');
const vehicleRoutes = require('./services/vehicles');
const driverRoutes = require('./services/drivers');
const tripRoutes = require('./services/trips');
const maintenanceRoutes = require('./services/maintenance');
const fuelRoutes = require('./services/fuel');
const expenseRoutes = require('./services/expenses');
const configRoutes = require('./services/config');
const dashboardRoutes = require('./services/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'TransitOps API is running', version: '1.0.0' });
});

// Routes — each service owns its own path
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/config', configRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`TransitOps API listening on http://localhost:${PORT}`);
});

module.exports = app;

