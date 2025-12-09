const db = require('../database/db');

class Municipality {
  static async getAll() {
    return await db.all('SELECT * FROM municipalities ORDER BY name');
  }

  static async getByCode(code) {
    return await db.get('SELECT * FROM municipalities WHERE code = ?', [code]);
  }

  static async getByProvince(provinceCode) {
    return await db.all(`
      SELECT * FROM municipalities 
      WHERE province_code = ? 
      ORDER BY name
    `, [provinceCode]);
  }

  static async getByRegion(regionCode) {
    return await db.all(`
      SELECT * FROM municipalities 
      WHERE region_code = ? 
      ORDER BY name
    `, [regionCode]);
  }

  static async getProvince(municipalityCode) {
    return await db.get(`
      SELECT p.* FROM provinces p
      INNER JOIN municipalities m ON p.code = m.province_code
      WHERE m.code = ?
    `, [municipalityCode]);
  }

  static async getRegion(municipalityCode) {
    return await db.get(`
      SELECT r.* FROM regions r
      INNER JOIN municipalities m ON r.code = m.region_code
      WHERE m.code = ?
    `, [municipalityCode]);
  }

  static async getBarangays(municipalityCode) {
    return await db.all(`
      SELECT * FROM barangays 
      WHERE municipality_code = ? 
      ORDER BY name
    `, [municipalityCode]);
  }

  static async search(query) {
    return await db.all(`
      SELECT * FROM municipalities 
      WHERE name LIKE ? 
      ORDER BY name
      LIMIT 50
    `, [`%${query}%`]);
  }
}

module.exports = Municipality;
