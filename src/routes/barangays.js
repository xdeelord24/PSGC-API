const express = require('express');
const router = express.Router();
const {
  getAllBarangays,
  getBarangayByCode,
  getBarangaysByCity,
  getBarangaysByMunicipality,
  getBarangaysByProvince,
  getBarangaysByRegion
} = require('../controllers/barangayController');

// GET /api/v1/barangays - Get all barangays (with optional limit)
router.get('/', getAllBarangays);

// GET /api/v1/barangays/city/:cityCode - Get barangays by city
router.get('/city/:cityCode', getBarangaysByCity);

// GET /api/v1/barangays/municipality/:municipalityCode - Get barangays by municipality
router.get('/municipality/:municipalityCode', getBarangaysByMunicipality);

// GET /api/v1/barangays/province/:provinceCode - Get barangays by province
router.get('/province/:provinceCode', getBarangaysByProvince);

// GET /api/v1/barangays/region/:regionCode - Get barangays by region
router.get('/region/:regionCode', getBarangaysByRegion);

// GET /api/v1/barangays/:code - Get barangay by code
router.get('/:code', getBarangayByCode);

module.exports = router;

