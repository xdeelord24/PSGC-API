const express = require('express');
const router = express.Router();
const {
  getAllCities,
  getCityByCode,
  getCityBarangays,
  getCitiesByProvince,
  getCitiesByRegion
} = require('../controllers/cityController');

// GET /api/v1/cities - Get all cities
router.get('/', getAllCities);

// GET /api/v1/cities/province/:provinceCode - Get cities by province
router.get('/province/:provinceCode', getCitiesByProvince);

// GET /api/v1/cities/region/:regionCode - Get cities by region
router.get('/region/:regionCode', getCitiesByRegion);

// GET /api/v1/cities/:code - Get city by code
router.get('/:code', getCityByCode);

// GET /api/v1/cities/:code/barangays - Get barangays in a city
router.get('/:code/barangays', getCityBarangays);

module.exports = router;

