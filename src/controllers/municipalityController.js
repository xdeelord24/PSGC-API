const Municipality = require('../models/Municipality');

const getAllMunicipalities = async (req, res) => {
  try {
    const municipalities = await Municipality.getAll();
    res.json({
      data: municipalities,
      count: municipalities.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMunicipalityByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const municipality = await Municipality.getByCode(code);
    
    if (!municipality) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Municipality with code ${code} not found` 
      });
    }

    const province = await Municipality.getProvince(code);
    const region = await Municipality.getRegion(code);
    
    res.json({ 
      data: {
        ...municipality,
        province: province || null,
        region: region || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMunicipalityBarangays = async (req, res) => {
  try {
    const { code } = req.params;
    const municipality = await Municipality.getByCode(code);
    
    if (!municipality) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Municipality with code ${code} not found` 
      });
    }

    const barangays = await Municipality.getBarangays(code);
    res.json({
      data: barangays,
      count: barangays.length,
      municipality: {
        code: municipality.code,
        name: municipality.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMunicipalitiesByProvince = async (req, res) => {
  try {
    const { provinceCode } = req.params;
    const municipalities = await Municipality.getByProvince(provinceCode);
    res.json({
      data: municipalities,
      count: municipalities.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMunicipalitiesByRegion = async (req, res) => {
  try {
    const { regionCode } = req.params;
    const municipalities = await Municipality.getByRegion(regionCode);
    res.json({
      data: municipalities,
      count: municipalities.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllMunicipalities,
  getMunicipalityByCode,
  getMunicipalityBarangays,
  getMunicipalitiesByProvince,
  getMunicipalitiesByRegion
};
