const db = require('../database/db');

class City {
  static async getAll() {
    return await db.all('SELECT * FROM cities ORDER BY name');
  }

  static async getByCode(code) {
    return await db.get('SELECT * FROM cities WHERE code = ?', [code]);
  }

  static async getByProvince(provinceCode) {
    return await db.all(`
      SELECT * FROM cities 
      WHERE province_code = ? 
      ORDER BY name
    `, [provinceCode]);
  }

  static async getByRegion(regionCode) {
    return await db.all(`
      SELECT * FROM cities 
      WHERE region_code = ? 
      ORDER BY name
    `, [regionCode]);
  }

  static async getProvince(cityCode) {
    return await db.get(`
      SELECT p.* FROM provinces p
      INNER JOIN cities c ON p.code = c.province_code
      WHERE c.code = ?
    `, [cityCode]);
  }

  static async getRegion(cityCode) {
    return await db.get(`
      SELECT r.* FROM regions r
      INNER JOIN cities c ON r.code = c.region_code
      WHERE c.code = ?
    `, [cityCode]);
  }

  static async getBarangays(cityCode) {
    return await db.all(`
      SELECT * FROM barangays 
      WHERE city_code = ? 
      ORDER BY name
    `, [cityCode]);
  }

  static async search(query) {
    return await db.all(`
      SELECT * FROM cities 
      WHERE name LIKE ? 
      ORDER BY name
      LIMIT 50
    `, [`%${query}%`]);
  }
}

module.exports = City;
