const db = require('../database/db');

class Province {
  static async getAll() {
    return await db.all('SELECT * FROM provinces ORDER BY name');
  }

  static async getByCode(code) {
    return await db.get('SELECT * FROM provinces WHERE code = ?', [code]);
  }

  static async getByRegion(regionCode) {
    return await db.all(`
      SELECT * FROM provinces 
      WHERE region_code = ? 
      ORDER BY name
    `, [regionCode]);
  }

  static async getRegion(provinceCode) {
    return await db.get(`
      SELECT r.* FROM regions r
      INNER JOIN provinces p ON r.code = p.region_code
      WHERE p.code = ?
    `, [provinceCode]);
  }

  static async getCities(provinceCode) {
    return await db.all(`
      SELECT * FROM cities 
      WHERE province_code = ? 
      ORDER BY name
    `, [provinceCode]);
  }

  static async getMunicipalities(provinceCode) {
    return await db.all(`
      SELECT * FROM municipalities 
      WHERE province_code = ? 
      ORDER BY name
    `, [provinceCode]);
  }

  static async getBarangays(provinceCode) {
    return await db.all(`
      SELECT * FROM barangays 
      WHERE province_code = ? 
      ORDER BY name
      LIMIT 1000
    `, [provinceCode]);
  }

  static async search(query) {
    return await db.all(`
      SELECT * FROM provinces 
      WHERE name LIKE ? 
      ORDER BY name
      LIMIT 50
    `, [`%${query}%`]);
  }
}

module.exports = Province;
