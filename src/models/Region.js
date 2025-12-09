const db = require('../database/db');

class Region {
  static async getAll() {
    return await db.all('SELECT * FROM regions ORDER BY name');
  }

  static async getByCode(code) {
    return await db.get('SELECT * FROM regions WHERE code = ?', [code]);
  }

  static async getProvinces(regionCode) {
    return await db.all(`
      SELECT * FROM provinces 
      WHERE region_code = ? 
      ORDER BY name
    `, [regionCode]);
  }

  static async getCities(regionCode) {
    return await db.all(`
      SELECT * FROM cities 
      WHERE region_code = ? 
      ORDER BY name
    `, [regionCode]);
  }

  static async getMunicipalities(regionCode) {
    return await db.all(`
      SELECT * FROM municipalities 
      WHERE region_code = ? 
      ORDER BY name
    `, [regionCode]);
  }

  static async search(query) {
    return await db.all(`
      SELECT * FROM regions 
      WHERE name LIKE ? 
      ORDER BY name
      LIMIT 50
    `, [`%${query}%`]);
  }
}

module.exports = Region;
