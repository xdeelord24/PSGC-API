const db = require('../database/db');

class Barangay {
  static async getAll(limit = 1000) {
    return await db.all(`
      SELECT * FROM barangays 
      ORDER BY name 
      LIMIT ?
    `, [limit]);
  }

  static async getByCode(code) {
    return await db.get('SELECT * FROM barangays WHERE code = ?', [code]);
  }

  static async getByCity(cityCode) {
    return await db.all(`
      SELECT * FROM barangays 
      WHERE city_code = ? 
      ORDER BY name
    `, [cityCode]);
  }

  static async getByMunicipality(municipalityCode) {
    return await db.all(`
      SELECT * FROM barangays 
      WHERE municipality_code = ? 
      ORDER BY name
    `, [municipalityCode]);
  }

  static async getByProvince(provinceCode, limit = 1000) {
    return await db.all(`
      SELECT * FROM barangays 
      WHERE province_code = ? 
      ORDER BY name
      LIMIT ?
    `, [provinceCode, limit]);
  }

  static async getByRegion(regionCode, limit = 1000) {
    return await db.all(`
      SELECT * FROM barangays 
      WHERE region_code = ? 
      ORDER BY name
      LIMIT ?
    `, [regionCode, limit]);
  }

  static async getCity(barangayCode) {
    return await db.get(`
      SELECT c.* FROM cities c
      INNER JOIN barangays b ON c.code = b.city_code
      WHERE b.code = ?
    `, [barangayCode]);
  }

  static async getMunicipality(barangayCode) {
    return await db.get(`
      SELECT m.* FROM municipalities m
      INNER JOIN barangays b ON m.code = b.municipality_code
      WHERE b.code = ?
    `, [barangayCode]);
  }

  static async getProvince(barangayCode) {
    return await db.get(`
      SELECT p.* FROM provinces p
      INNER JOIN barangays b ON p.code = b.province_code
      WHERE b.code = ?
    `, [barangayCode]);
  }

  static async getRegion(barangayCode) {
    return await db.get(`
      SELECT r.* FROM regions r
      INNER JOIN barangays b ON r.code = b.region_code
      WHERE b.code = ?
    `, [barangayCode]);
  }

  static async search(query, limit = 100) {
    return await db.all(`
      SELECT * FROM barangays 
      WHERE name LIKE ? 
      ORDER BY name
      LIMIT ?
    `, [`%${query}%`, limit]);
  }

  static async getCount() {
    const result = await db.get('SELECT COUNT(*) as count FROM barangays');
    return result ? result.count : 0;
  }
}

module.exports = Barangay;
