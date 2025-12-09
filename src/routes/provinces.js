const express = require('express');
const router = express.Router();
const {
  getAllProvinces,
  getProvinceByCode,
  getProvinceCities,
  getProvinceMunicipalities,
  getProvinceBarangays,
  getProvincesByRegion
} = require('../controllers/provinceController');

// GET /api/v1/provinces - Get all provinces
router.get('/', getAllProvinces);

// GET /api/v1/provinces/region/:regionCode - Get provinces by region
router.get('/region/:regionCode', getProvincesByRegion);

// GET /api/v1/provinces/:code - Get province by code
router.get('/:code', getProvinceByCode);

// GET /api/v1/provinces/:code/cities - Get cities in a province
router.get('/:code/cities', getProvinceCities);

// GET /api/v1/provinces/:code/municipalities - Get municipalities in a province
router.get('/:code/municipalities', getProvinceMunicipalities);

// GET /api/v1/provinces/:code/barangays - Get barangays in a province
router.get('/:code/barangays', getProvinceBarangays);

module.exports = router;

