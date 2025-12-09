const express = require('express');
const router = express.Router();
const { searchAll } = require('../controllers/searchController');

// GET /api/v1/search?q=query&type=all&limit=20
// type can be: all, regions, provinces, cities, municipalities, barangays
router.get('/', searchAll);

module.exports = router;

