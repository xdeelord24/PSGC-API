/**
 * Sample Data Seeder
 * 
 * This script seeds the database with sample PSGC data for testing.
 * Replace this with actual PSGC data from PSA.
 */

const db = require('../database/db');

// Sample regions (NCR and CALABARZON)
const sampleRegions = [
  {
    code: '130000000',
    name: 'National Capital Region',
    island_group_code: '1',
    island_group_name: 'Luzon'
  },
  {
    code: '040000000',
    name: 'CALABARZON',
    island_group_code: '1',
    island_group_name: 'Luzon'
  }
];

// Sample provinces
const sampleProvinces = [
  {
    code: '137400000',
    name: 'Metro Manila',
    region_code: '130000000',
    island_group_code: '1'
  },
  {
    code: '042100000',
    name: 'Laguna',
    region_code: '040000000',
    island_group_code: '1'
  }
];

// Sample cities
const sampleCities = [
  {
    code: '137401000',
    name: 'Manila',
    province_code: '137400000',
    region_code: '130000000',
    city_class: 'HUC',
    is_capital: 1
  },
  {
    code: '042110000',
    name: 'Calamba',
    province_code: '042100000',
    region_code: '040000000',
    city_class: 'CC',
    is_capital: 0
  }
];

// Sample municipalities
const sampleMunicipalities = [
  {
    code: '042111000',
    name: 'Bay',
    province_code: '042100000',
    region_code: '040000000',
    is_capital: 0
  }
];

// Sample barangays
const sampleBarangays = [
  {
    code: '137401001',
    name: 'Binondo',
    city_code: '137401000',
    province_code: '137400000',
    region_code: '130000000',
    urban_rural: 'Urban'
  },
  {
    code: '042110001',
    name: 'Banlic',
    city_code: '042110000',
    province_code: '042100000',
    region_code: '040000000',
    urban_rural: 'Urban'
  },
  {
    code: '042111001',
    name: 'Bitin',
    municipality_code: '042111000',
    province_code: '042100000',
    region_code: '040000000',
    urban_rural: 'Rural'
  }
];

function seedDatabase() {
  console.log('Seeding database with sample data...');

  const transaction = db.transaction(() => {
    // Insert regions
    const regionStmt = db.prepare(`
      INSERT OR REPLACE INTO regions (code, name, island_group_code, island_group_name)
      VALUES (?, ?, ?, ?)
    `);
    sampleRegions.forEach(region => {
      regionStmt.run(region.code, region.name, region.island_group_code, region.island_group_name);
    });
    console.log(`✓ Inserted ${sampleRegions.length} regions`);

    // Insert provinces
    const provinceStmt = db.prepare(`
      INSERT OR REPLACE INTO provinces (code, name, region_code, island_group_code)
      VALUES (?, ?, ?, ?)
    `);
    sampleProvinces.forEach(province => {
      provinceStmt.run(province.code, province.name, province.region_code, province.island_group_code);
    });
    console.log(`✓ Inserted ${sampleProvinces.length} provinces`);

    // Insert cities
    const cityStmt = db.prepare(`
      INSERT OR REPLACE INTO cities (code, name, province_code, region_code, city_class, is_capital)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    sampleCities.forEach(city => {
      cityStmt.run(city.code, city.name, city.province_code, city.region_code, city.city_class, city.is_capital);
    });
    console.log(`✓ Inserted ${sampleCities.length} cities`);

    // Insert municipalities
    const municipalityStmt = db.prepare(`
      INSERT OR REPLACE INTO municipalities (code, name, province_code, region_code, is_capital)
      VALUES (?, ?, ?, ?, ?)
    `);
    sampleMunicipalities.forEach(municipality => {
      municipalityStmt.run(municipality.code, municipality.name, municipality.province_code, municipality.region_code, municipality.is_capital);
    });
    console.log(`✓ Inserted ${sampleMunicipalities.length} municipalities`);

    // Insert barangays
    const barangayStmt = db.prepare(`
      INSERT OR REPLACE INTO barangays (code, name, city_code, municipality_code, province_code, region_code, urban_rural)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    sampleBarangays.forEach(barangay => {
      barangayStmt.run(
        barangay.code,
        barangay.name,
        barangay.city_code || null,
        barangay.municipality_code || null,
        barangay.province_code,
        barangay.region_code,
        barangay.urban_rural
      );
    });
    console.log(`✓ Inserted ${sampleBarangays.length} barangays`);
  });

  transaction();
  console.log('\n✓ Database seeding completed!');
  console.log('\nYou can now test the API with the sample data.');
}

if (require.main === module) {
  try {
    seedDatabase();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

module.exports = { seedDatabase };

