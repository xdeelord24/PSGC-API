const Barangay = require('../models/Barangay');

const getAllBarangays = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const barangays = await Barangay.getAll(limit);
    const totalCount = await Barangay.getCount();
    res.json({
      data: barangays,
      count: barangays.length,
      total: totalCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBarangayByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const barangay = await Barangay.getByCode(code);
    
    if (!barangay) {
      return res.status(404).json({ 
        error: 'Not found',
        message: `Barangay with code ${code} not found` 
      });
    }

    const city = await Barangay.getCity(code);
    const municipality = await Barangay.getMunicipality(code);
    const province = await Barangay.getProvince(code);
    const region = await Barangay.getRegion(code);
    
    res.json({ 
      data: {
        ...barangay,
        city: city || null,
        municipality: municipality || null,
        province: province || null,
        region: region || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBarangaysByCity = async (req, res) => {
  try {
    const { cityCode } = req.params;
    const barangays = await Barangay.getByCity(cityCode);
    res.json({
      data: barangays,
      count: barangays.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBarangaysByMunicipality = async (req, res) => {
  try {
    const { municipalityCode } = req.params;
    const barangays = await Barangay.getByMunicipality(municipalityCode);
    res.json({
      data: barangays,
      count: barangays.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBarangaysByProvince = async (req, res) => {
  try {
    const { provinceCode } = req.params;
    const limit = parseInt(req.query.limit) || 1000;
    const barangays = await Barangay.getByProvince(provinceCode, limit);
    res.json({
      data: barangays,
      count: barangays.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBarangaysByRegion = async (req, res) => {
  try {
    const { regionCode } = req.params;
    const limit = parseInt(req.query.limit) || 1000;
    const barangays = await Barangay.getByRegion(regionCode, limit);
    res.json({
      data: barangays,
      count: barangays.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllBarangays,
  getBarangayByCode,
  getBarangaysByCity,
  getBarangaysByMunicipality,
  getBarangaysByProvince,
  getBarangaysByRegion
};
