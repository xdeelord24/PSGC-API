const express = require('express');
const router = express.Router();
const {
  getAllMunicipalities,
  getMunicipalityByCode,
  getMunicipalityBarangays,
  getMunicipalitiesByProvince,
  getMunicipalitiesByRegion
} = require('../controllers/municipalityController');

// GET /api/v1/municipalities - Get all municipalities
router.get('/', getAllMunicipalities);

// GET /api/v1/municipalities/province/:provinceCode - Get municipalities by province
router.get('/province/:provinceCode', getMunicipalitiesByProvince);

// GET /api/v1/municipalities/region/:regionCode - Get municipalities by region
router.get('/region/:regionCode', getMunicipalitiesByRegion);

// GET /api/v1/municipalities/:code - Get municipality by code
router.get('/:code', getMunicipalityByCode);

// GET /api/v1/municipalities/:code/barangays - Get barangays in a municipality
router.get('/:code/barangays', getMunicipalityBarangays);

module.exports = router;

