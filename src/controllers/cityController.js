const City = require('../models/City');

const getAllCities = async (req, res) => {
  try {
    const cities = await City.getAll();
    res.json({
      data: cities,
      count: cities.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCityByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const city = await City.getByCode(code);
    
    if (!city) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `City with code ${code} not found` 
      });
    }

    const province = await City.getProvince(code);
    const region = await City.getRegion(code);
    
    res.json({ 
      data: {
        ...city,
        province: province || null,
        region: region || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCityBarangays = async (req, res) => {
  try {
    const { code } = req.params;
    const city = await City.getByCode(code);
    
    if (!city) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `City with code ${code} not found` 
      });
    }

    const barangays = await City.getBarangays(code);
    res.json({
      data: barangays,
      count: barangays.length,
      city: {
        code: city.code,
        name: city.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCitiesByProvince = async (req, res) => {
  try {
    const { provinceCode } = req.params;
    const cities = await City.getByProvince(provinceCode);
    res.json({
      data: cities,
      count: cities.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCitiesByRegion = async (req, res) => {
  try {
    const { regionCode } = req.params;
    const cities = await City.getByRegion(regionCode);
    res.json({
      data: cities,
      count: cities.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllCities,
  getCityByCode,
  getCityBarangays,
  getCitiesByProvince,
  getCitiesByRegion
};
