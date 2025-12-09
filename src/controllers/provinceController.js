const Province = require('../models/Province');

const getAllProvinces = async (req, res) => {
  try {
    const provinces = await Province.getAll();
    res.json({
      data: provinces,
      count: provinces.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getProvinceByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const province = await Province.getByCode(code);
    
    if (!province) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Province with code ${code} not found` 
      });
    }

    const region = await Province.getRegion(code);
    res.json({ 
      data: {
        ...province,
        region: region || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getProvinceCities = async (req, res) => {
  try {
    const { code } = req.params;
    const province = await Province.getByCode(code);
    
    if (!province) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Province with code ${code} not found` 
      });
    }

    const cities = await Province.getCities(code);
    res.json({
      data: cities,
      count: cities.length,
      province: {
        code: province.code,
        name: province.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getProvinceMunicipalities = async (req, res) => {
  try {
    const { code } = req.params;
    const province = await Province.getByCode(code);
    
    if (!province) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Province with code ${code} not found` 
      });
    }

    const municipalities = await Province.getMunicipalities(code);
    res.json({
      data: municipalities,
      count: municipalities.length,
      province: {
        code: province.code,
        name: province.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getProvinceBarangays = async (req, res) => {
  try {
    const { code } = req.params;
    const province = await Province.getByCode(code);
    
    if (!province) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Province with code ${code} not found` 
      });
    }

    const barangays = await Province.getBarangays(code);
    res.json({
      data: barangays,
      count: barangays.length,
      province: {
        code: province.code,
        name: province.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getProvincesByRegion = async (req, res) => {
  try {
    const { regionCode } = req.params;
    const provinces = await Province.getByRegion(regionCode);
    res.json({
      data: provinces,
      count: provinces.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllProvinces,
  getProvinceByCode,
  getProvinceCities,
  getProvinceMunicipalities,
  getProvinceBarangays,
  getProvincesByRegion
};
