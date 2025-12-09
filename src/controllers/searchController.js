const Region = require('../models/Region');
const Province = require('../models/Province');
const City = require('../models/City');
const Municipality = require('../models/Municipality');
const Barangay = require('../models/Barangay');

const searchAll = async (req, res) => {
  try {
    const { q, type, limit } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Query parameter "q" is required' 
      });
    }

    const searchLimit = parseInt(limit) || 20;
    const searchType = type ? type.toLowerCase() : 'all';

    let results = {};

    if (searchType === 'all' || searchType === 'regions') {
      results.regions = await Region.search(q);
    }

    if (searchType === 'all' || searchType === 'provinces') {
      results.provinces = await Province.search(q);
    }

    if (searchType === 'all' || searchType === 'cities') {
      results.cities = await City.search(q);
    }

    if (searchType === 'all' || searchType === 'municipalities') {
      results.municipalities = await Municipality.search(q);
    }

    if (searchType === 'all' || searchType === 'barangays') {
      results.barangays = await Barangay.search(q, searchLimit);
    }

    const totalCount = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    res.json({
      query: q,
      type: searchType,
      data: results,
      counts: {
        regions: results.regions?.length || 0,
        provinces: results.provinces?.length || 0,
        cities: results.cities?.length || 0,
        municipalities: results.municipalities?.length || 0,
        barangays: results.barangays?.length || 0,
        total: totalCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  searchAll
};
