require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const regionRoutes = require('./routes/regions');
const provinceRoutes = require('./routes/provinces');
const cityRoutes = require('./routes/cities');
const municipalityRoutes = require('./routes/municipalities');
const barangayRoutes = require('./routes/barangays');
const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (web UI)
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// API Routes
app.use('/api/v1/regions', regionRoutes);
app.use('/api/v1/provinces', provinceRoutes);
app.use('/api/v1/cities', cityRoutes);
app.use('/api/v1/municipalities', municipalityRoutes);
app.use('/api/v1/barangays', barangayRoutes);
app.use('/api/v1/search', searchRoutes);

// Serve web UI at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'PSGC API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Philippine Standard Geographic Code (PSGC) API',
    version: '1.0.0',
    description: 'API for accessing updated PSGC data from Philippine Statistics Authority (PSA)',
    endpoints: {
      regions: '/api/v1/regions',
      provinces: '/api/v1/provinces',
      cities: '/api/v1/cities',
      municipalities: '/api/v1/municipalities',
      barangays: '/api/v1/barangays',
      search: '/api/v1/search'
    },
    documentation: 'https://psa.gov.ph/classification/psgc/'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.listen(PORT, () => {
  console.log(`PSGC API server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

module.exports = app;

