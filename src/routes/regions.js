const express = require('express');
const router = express.Router();
const {
  getAllRegions,
  getRegionByCode,
  getRegionProvinces,
  getRegionCities,
  getRegionMunicipalities
} = require('../controllers/regionController');

// GET /api/v1/regions - Get all regions
router.get('/', getAllRegions);

// GET /api/v1/regions/:code - Get region by code
router.get('/:code', getRegionByCode);

// GET /api/v1/regions/:code/provinces - Get provinces in a region
router.get('/:code/provinces', getRegionProvinces);

// GET /api/v1/regions/:code/cities - Get cities in a region
router.get('/:code/cities', getRegionCities);

// GET /api/v1/regions/:code/municipalities - Get municipalities in a region
router.get('/:code/municipalities', getRegionMunicipalities);

module.exports = router;

