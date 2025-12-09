const Region = require('../models/Region');

const getAllRegions = async (req, res) => {
  try {
    const regions = await Region.getAll();
    res.json({
      data: regions,
      count: regions.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRegionByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const region = await Region.getByCode(code);
    
    if (!region) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Region with code ${code} not found` 
      });
    }

    res.json({ data: region });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRegionProvinces = async (req, res) => {
  try {
    const { code } = req.params;
    const region = await Region.getByCode(code);
    
    if (!region) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Region with code ${code} not found` 
      });
    }

    const provinces = await Region.getProvinces(code);
    res.json({
      data: provinces,
      count: provinces.length,
      region: {
        code: region.code,
        name: region.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRegionCities = async (req, res) => {
  try {
    const { code } = req.params;
    const region = await Region.getByCode(code);
    
    if (!region) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Region with code ${code} not found` 
      });
    }

    const cities = await Region.getCities(code);
    res.json({
      data: cities,
      count: cities.length,
      region: {
        code: region.code,
        name: region.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRegionMunicipalities = async (req, res) => {
  try {
    const { code } = req.params;
    const region = await Region.getByCode(code);
    
    if (!region) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Region with code ${code} not found` 
      });
    }

    const municipalities = await Region.getMunicipalities(code);
    res.json({
      data: municipalities,
      count: municipalities.length,
      region: {
        code: region.code,
        name: region.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllRegions,
  getRegionByCode,
  getRegionProvinces,
  getRegionCities,
  getRegionMunicipalities
};
