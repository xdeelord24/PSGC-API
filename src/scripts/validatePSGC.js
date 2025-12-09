/**
 * PSGC Data Validation Script
 * 
 * This script validates the PSGC data classification and counts
 * against PSA (Philippine Statistics Authority) standards
 */

const db = require('../database/db');
const fs = require('fs');

// PSA Official Statistics (as of September 30, 2025)
// Source: PSA Geographic Level Total Number (as of 30 September 2025)
// Region: 18
// Province: 82
// Highly Urbanized City (HUC): 33
// Other Cities: 116 (Independent Component City: 5, Component City: 111)
// Total Cities: 149 (33 HUC + 116 other)
// Municipality: 1,493
// Barangay: 42,011
const PSA_STANDARDS = {
  regions: { exact: 18, min: 18, max: 18 },
  provinces: { exact: 82, min: 82, max: 82 },
  cities: { 
    exact: 149, // 33 HUC + 116 other (5 ICC + 111 CC)
    min: 149, 
    max: 149,
    breakdown: {
      huc: 33,    // Highly Urbanized City
      icc: 5,     // Independent Component City
      cc: 111     // Component City
    }
  },
  municipalities: { exact: 1493, min: 1493, max: 1493 },
  barangays: { exact: 42011, min: 42011, max: 42011 }
};

// PSA Website URLs
const PSA_BASE_URL = 'https://psa.gov.ph';
const PSA_PSGC_URL = 'https://psa.gov.ph/classification/psgc';

// Normalize PSGC code to 9 digits
function normalizeCode(code) {
  if (!code) return null;
  const codeStr = String(code).trim();
  if (codeStr.length === 0) return null;
  return codeStr.padStart(9, '0').substring(0, 9);
}

// Validate data file
async function validateDataFile(filePath) {
  console.log(`Validating data from ${filePath}...\n`);
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Total records in file: ${data.length}\n`);
  
  const counts = {
    regions: 0,
    provinces: 0,
    cities: 0,
    municipalities: 0,
    barangays: 0,
    districts: 0,
    unknown: 0
  };
  
  const issues = [];
  const samples = {
    regions: [],
    provinces: [],
    cities: [],
    municipalities: [],
    barangays: [],
    districts: [],
    unknown: []
  };
  
  data.forEach((item, index) => {
    const code = normalizeCode(item.code || item.Code || item.CODE);
    const name = (item.name || item.Name || item.NAME || '').trim();
    const type = item.type || item.Type || item.TYPE || '';
    
    if (!code || code === '000000000') {
      return;
    }
    
    // Classify by PSGC pattern
    if (code.match(/^\d{2}0000000$/)) {
      // Region: XX0000000
      counts.regions++;
      if (samples.regions.length < 3) samples.regions.push({ code, name, type });
    } else if (code.match(/^\d{4}00000$/)) {
      // Province: XXYY00000
      counts.provinces++;
      if (samples.provinces.length < 3) samples.provinces.push({ code, name, type });
    } else if (code.match(/^\d{5}0000$/)) {
      // District: XXYYZ0000 (not standard PSGC but may exist)
      counts.districts++;
      if (samples.districts.length < 3) samples.districts.push({ code, name, type });
    } else if (code.match(/^\d{6}000$/)) {
      // City/Municipality: XXYYZZ000
      const isCity = type === 'City' || 
                     name.toLowerCase().includes('city of') || 
                     name.toLowerCase().endsWith(' city') ||
                     name.toLowerCase().includes('city');
      
      if (isCity) {
        counts.cities++;
        if (samples.cities.length < 3) samples.cities.push({ code, name, type });
      } else {
        counts.municipalities++;
        if (samples.municipalities.length < 3) samples.municipalities.push({ code, name, type });
      }
    } else if (code.match(/^\d{9}$/) && !code.match(/000$/)) {
      // Barangay: XXYYZZAAA (last 3 digits NOT 000)
      counts.barangays++;
      if (samples.barangays.length < 3) samples.barangays.push({ code, name, type });
    } else {
      // Unknown pattern
      counts.unknown++;
      if (samples.unknown.length < 5) {
        samples.unknown.push({ code, name, type, index });
      }
      issues.push(`Unknown pattern at index ${index}: code=${code}, name="${name}"`);
    }
  });
  
  console.log('📊 Classification Counts:');
  console.log(`  Regions: ${counts.regions}`);
  console.log(`  Provinces: ${counts.provinces}`);
  console.log(`  Districts: ${counts.districts}`);
  console.log(`  Cities: ${counts.cities}`);
  console.log(`  Municipalities: ${counts.municipalities}`);
  console.log(`  Barangays: ${counts.barangays}`);
  console.log(`  Unknown: ${counts.unknown}`);
  console.log(`  Total Classified: ${counts.regions + counts.provinces + counts.districts + counts.cities + counts.municipalities + counts.barangays}`);
  console.log(`  Total in File: ${data.length}`);
  
  if (counts.unknown > 0) {
    console.log(`\n⚠️  Found ${counts.unknown} items with unknown patterns`);
    console.log('\nSample unknown items:');
    samples.unknown.forEach(item => {
      console.log(`  - Code: ${item.code}, Name: "${item.name}", Type: "${item.type}"`);
    });
  }
  
  console.log('\n📋 Sample Items:');
  console.log('\nRegions:');
  samples.regions.forEach(item => console.log(`  ${item.code} - ${item.name}`));
  console.log('\nProvinces:');
  samples.provinces.forEach(item => console.log(`  ${item.code} - ${item.name}`));
  console.log('\nCities:');
  samples.cities.forEach(item => console.log(`  ${item.code} - ${item.name}`));
  console.log('\nMunicipalities:');
  samples.municipalities.forEach(item => console.log(`  ${item.code} - ${item.name}`));
  console.log('\nBarangays:');
  samples.barangays.forEach(item => console.log(`  ${item.code} - ${item.name}`));
  
  // Validate against PSA official standards (as of Sept 30, 2025)
  console.log('\n\n✅ PSA Official Standard Validation (as of September 30, 2025):');
  console.log(`   Source: ${PSA_PSGC_URL}\n`);
  const validationIssues = [];
  
  const validateCount = (name, actual, standard) => {
    const diff = actual - standard.exact;
    const withinRange = actual >= standard.min && actual <= standard.max;
    const exactMatch = actual === standard.exact;
    
    if (exactMatch) {
      console.log(`  ✅ ${name}: ${actual} (EXACT MATCH with PSA official: ${standard.exact})`);
      return null;
    } else if (withinRange) {
      console.log(`  ⚠️  ${name}: ${actual} (PSA official: ${standard.exact}, difference: ${diff > 0 ? '+' : ''}${diff})`);
      return `(${name} count (${actual}) differs from PSA official (${standard.exact}), difference: ${diff > 0 ? '+' : ''}${diff})`;
    } else {
      console.log(`  ❌ ${name}: ${actual} (PSA official: ${standard.exact}, difference: ${diff > 0 ? '+' : ''}${diff}, OUTSIDE expected range ${standard.min}-${standard.max})`);
      return `${name} count (${actual}) outside expected range (${standard.min}-${standard.max}), PSA official: ${standard.exact}`;
    }
  };
  
  const regionIssue = validateCount('Regions', counts.regions, PSA_STANDARDS.regions);
  if (regionIssue) validationIssues.push(regionIssue);
  
  const provinceIssue = validateCount('Provinces', counts.provinces, PSA_STANDARDS.provinces);
  if (provinceIssue) validationIssues.push(provinceIssue);
  
  const cityIssue = validateCount('Cities', counts.cities, PSA_STANDARDS.cities);
  if (cityIssue) validationIssues.push(cityIssue);
  
  const muniIssue = validateCount('Municipalities', counts.municipalities, PSA_STANDARDS.municipalities);
  if (muniIssue) validationIssues.push(muniIssue);
  
  const brgyIssue = validateCount('Barangays', counts.barangays, PSA_STANDARDS.barangays);
  if (brgyIssue) validationIssues.push(brgyIssue);
  
  return { counts, issues, samples, validationIssues };
}

// Validate database
async function validateDatabase() {
  console.log('\n\n🔍 Validating Database...\n');
  
  await db.initializeDatabase();
  
  const dbCounts = {
    regions: (await db.all('SELECT COUNT(*) as c FROM regions'))[0].c,
    provinces: (await db.all('SELECT COUNT(*) as c FROM provinces'))[0].c,
    cities: (await db.all('SELECT COUNT(*) as c FROM cities'))[0].c,
    municipalities: (await db.all('SELECT COUNT(*) as c FROM municipalities'))[0].c,
    barangays: (await db.all('SELECT COUNT(*) as c FROM barangays'))[0].c,
    districts: (await db.all('SELECT COUNT(*) as c FROM districts'))[0].c
  };
  
  console.log('📊 Database Counts:');
  console.log(`  Regions: ${dbCounts.regions}`);
  console.log(`  Provinces: ${dbCounts.provinces}`);
  console.log(`  Districts: ${dbCounts.districts}`);
  console.log(`  Cities: ${dbCounts.cities}`);
  console.log(`  Municipalities: ${dbCounts.municipalities}`);
  console.log(`  Barangays: ${dbCounts.barangays}`);
  console.log(`  Total: ${dbCounts.regions + dbCounts.provinces + dbCounts.districts + dbCounts.cities + dbCounts.municipalities + dbCounts.barangays}`);
  
  // Check for data quality issues
  console.log('\n🔍 Data Quality Checks:');
  
  // Check barangays without parent city/municipality
  const orphanBarangays = await db.all(`
    SELECT COUNT(*) as c FROM barangays 
    WHERE city_code IS NULL AND municipality_code IS NULL
  `);
  const orphanCount = orphanBarangays[0].c;
  if (orphanCount > 0) {
    console.log(`  ⚠️  Barangays without city/municipality: ${orphanCount}`);
  } else {
    console.log(`  ✓ All barangays have parent city/municipality`);
  }
  
  // Check cities/municipalities without province
  const orphanCities = await db.all(`
    SELECT COUNT(*) as c FROM cities 
    WHERE province_code IS NULL
  `);
  const orphanCitiesCount = orphanCities[0].c;
  if (orphanCitiesCount > 0) {
    console.log(`  ⚠️  Cities without province: ${orphanCitiesCount}`);
  } else {
    console.log(`  ✓ All cities have province`);
  }
  
  const orphanMunicipalities = await db.all(`
    SELECT COUNT(*) as c FROM municipalities 
    WHERE province_code IS NULL
  `);
  const orphanMuniCount = orphanMunicipalities[0].c;
  if (orphanMuniCount > 0) {
    console.log(`  ⚠️  Municipalities without province: ${orphanMuniCount}`);
  } else {
    console.log(`  ✓ All municipalities have province`);
  }
  
  // Validate PSGC code patterns
  console.log('\n🔍 PSGC Pattern Validation:');
  
  // Check for invalid region codes (must be XX0000000)
  const invalidRegions = await db.all(`
    SELECT code, name FROM regions 
    WHERE code NOT GLOB '[0-9][0-9]0000000'
    OR LENGTH(code) != 9
  `);
  if (invalidRegions.length > 0) {
    console.log(`  ⚠️  Invalid region codes: ${invalidRegions.length}`);
    invalidRegions.forEach(item => console.log(`    ${item.code} - ${item.name}`));
  } else {
    console.log(`  ✓ All region codes follow pattern XX0000000`);
  }
  
  // Check for invalid province codes (must be XXXX00000)
  const invalidProvinces = await db.all(`
    SELECT code, name FROM provinces 
    WHERE code NOT GLOB '[0-9][0-9][0-9][0-9]00000'
    OR LENGTH(code) != 9
  `);
  if (invalidProvinces.length > 0) {
    console.log(`  ⚠️  Invalid province codes: ${invalidProvinces.length}`);
    invalidProvinces.forEach(item => console.log(`    ${item.code} - ${item.name}`));
  } else {
    console.log(`  ✓ All province codes follow pattern XXXX00000`);
  }
  
  // Check for invalid city/municipality codes (must be XXXXXX000)
  const invalidCities = await db.all(`
    SELECT code, name FROM cities 
    WHERE code NOT GLOB '[0-9][0-9][0-9][0-9][0-9][0-9]000'
    OR LENGTH(code) != 9
  `);
  if (invalidCities.length > 0) {
    console.log(`  ⚠️  Invalid city codes: ${invalidCities.length}`);
    invalidCities.slice(0, 5).forEach(item => console.log(`    ${item.code} - ${item.name}`));
  } else {
    console.log(`  ✓ All city codes follow pattern XXXXXX000`);
  }
  
  const invalidMunicipalities = await db.all(`
    SELECT code, name FROM municipalities 
    WHERE code NOT GLOB '[0-9][0-9][0-9][0-9][0-9][0-9]000'
    OR LENGTH(code) != 9
  `);
  if (invalidMunicipalities.length > 0) {
    console.log(`  ⚠️  Invalid municipality codes: ${invalidMunicipalities.length}`);
    invalidMunicipalities.slice(0, 5).forEach(item => console.log(`    ${item.code} - ${item.name}`));
  } else {
    console.log(`  ✓ All municipality codes follow pattern XXXXXX000`);
  }
  
  // Check for invalid barangay codes (must be 9 digits, NOT ending in 000)
  const invalidBarangays = await db.all(`
    SELECT code, name FROM barangays 
    WHERE code LIKE '%000'
    OR code NOT GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
    OR LENGTH(code) != 9
    LIMIT 10
  `);
  if (invalidBarangays.length > 0) {
    console.log(`  ⚠️  Invalid barangay codes: ${invalidBarangays.length} found (showing first 10)`);
    invalidBarangays.forEach(item => console.log(`    ${item.code} - ${item.name}`));
  } else {
    console.log(`  ✓ All barangay codes follow pattern XXXXXXAAA (where AAA != 000)`);
  }
  
  // Validate relationships
  console.log('\n🔍 Relationship Validation:');
  
  // Check if barangay's parent city/municipality exists
  const invalidBarangayParents = await db.all(`
    SELECT b.code, b.name, b.city_code, b.municipality_code
    FROM barangays b
    LEFT JOIN cities c ON b.city_code = c.code
    LEFT JOIN municipalities m ON b.municipality_code = m.code
    WHERE (b.city_code IS NOT NULL AND c.code IS NULL)
       OR (b.municipality_code IS NOT NULL AND m.code IS NULL)
    LIMIT 10
  `);
  if (invalidBarangayParents.length > 0) {
    console.log(`  ⚠️  Barangays with non-existent parent city/municipality: ${invalidBarangayParents.length} (showing first 10)`);
    invalidBarangayParents.forEach(item => {
      console.log(`    ${item.code} - ${item.name} (city: ${item.city_code || 'null'}, muni: ${item.municipality_code || 'null'})`);
    });
  } else {
    console.log(`  ✓ All barangays have valid parent city/municipality references`);
  }
  
  // Check if city/municipality's province exists
  const invalidCityProvinces = await db.all(`
    SELECT c.code, c.name, c.province_code
    FROM cities c
    LEFT JOIN provinces p ON c.province_code = p.code
    WHERE c.province_code IS NOT NULL AND p.code IS NULL
    LIMIT 10
  `);
  if (invalidCityProvinces.length > 0) {
    console.log(`  ⚠️  Cities with non-existent province: ${invalidCityProvinces.length} (showing first 10)`);
    invalidCityProvinces.forEach(item => {
      console.log(`    ${item.code} - ${item.name} (province: ${item.province_code})`);
    });
  } else {
    console.log(`  ✓ All cities have valid province references`);
  }
  
  const invalidMuniProvinces = await db.all(`
    SELECT m.code, m.name, m.province_code
    FROM municipalities m
    LEFT JOIN provinces p ON m.province_code = p.code
    WHERE m.province_code IS NOT NULL AND p.code IS NULL
    LIMIT 10
  `);
  if (invalidMuniProvinces.length > 0) {
    console.log(`  ⚠️  Municipalities with non-existent province: ${invalidMuniProvinces.length} (showing first 10)`);
    invalidMuniProvinces.forEach(item => {
      console.log(`    ${item.code} - ${item.name} (province: ${item.province_code})`);
    });
  } else {
    console.log(`  ✓ All municipalities have valid province references`);
  }
  
  // Validate PSGC code hierarchy (barangay code should start with parent city/municipality code)
  const invalidHierarchy = await db.all(`
    SELECT b.code, b.name, b.city_code, b.municipality_code,
           COALESCE(b.city_code, b.municipality_code) as parent_code
    FROM barangays b
    WHERE (b.city_code IS NOT NULL AND SUBSTR(b.code, 1, 6) || '000' != b.city_code)
       OR (b.municipality_code IS NOT NULL AND SUBSTR(b.code, 1, 6) || '000' != b.municipality_code)
    LIMIT 10
  `);
  if (invalidHierarchy.length > 0) {
    console.log(`  ⚠️  Barangays with code hierarchy mismatch: ${invalidHierarchy.length} (showing first 10)`);
    invalidHierarchy.forEach(item => {
      const expectedParent = item.code.substring(0, 6) + '000';
      console.log(`    ${item.code} - ${item.name} (parent should be ${expectedParent}, but is ${item.parent_code || 'null'})`);
    });
  } else {
    console.log(`  ✓ All barangay codes follow PSGC hierarchy (parent code = first 6 digits + '000')`);
  }
  
  return dbCounts;
}

// Main validation
async function validate() {
  const filePath = process.argv[2] || 'data/psgc-data.json';
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File ${filePath} not found`);
    process.exit(1);
  }
  
  try {
    const fileValidation = await validateDataFile(filePath);
    const dbValidation = await validateDatabase();
    
    console.log('\n\n📊 Comparison:');
    console.log('File vs Database:');
    const comparisons = [
      { name: 'Regions', file: fileValidation.counts.regions, db: dbValidation.regions },
      { name: 'Provinces', file: fileValidation.counts.provinces, db: dbValidation.provinces },
      { name: 'Cities', file: fileValidation.counts.cities, db: dbValidation.cities },
      { name: 'Municipalities', file: fileValidation.counts.municipalities, db: dbValidation.municipalities },
      { name: 'Barangays', file: fileValidation.counts.barangays, db: dbValidation.barangays }
    ];
    
    comparisons.forEach(comp => {
      const match = comp.file === comp.db ? '✓' : '⚠️';
      console.log(`  ${match} ${comp.name}: ${comp.file} (file) vs ${comp.db} (database)`);
      if (comp.file !== comp.db) {
        console.log(`     → Difference: ${Math.abs(comp.file - comp.db)} records`);
      }
    });
    
    if (fileValidation.issues.length > 0) {
      console.log(`\n⚠️  Found ${fileValidation.issues.length} classification issues in file`);
    }
    
    if (fileValidation.validationIssues.length > 0) {
      console.log(`\n⚠️  Found ${fileValidation.validationIssues.length} PSA standard validation issues:`);
      fileValidation.validationIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
      console.log(`\n📌 For official PSGC data, visit: ${PSA_PSGC_URL}`);
      console.log(`   Latest updates as of September 30, 2025`);
    } else {
      console.log(`\n✅ All counts EXACTLY MATCH PSA official statistics!`);
      console.log(`   Verified against: ${PSA_PSGC_URL}`);
    }
    
    // Summary
    console.log('\n\n📊 Summary:');
    console.log(`   File contains: ${fileValidation.counts.regions + fileValidation.counts.provinces + fileValidation.counts.cities + fileValidation.counts.municipalities + fileValidation.counts.barangays} total classified records`);
    console.log(`   Database contains: ${dbValidation.regions + dbValidation.provinces + dbValidation.cities + dbValidation.municipalities + dbValidation.barangays} total records`);
    
    const totalIssues = (fileValidation.validationIssues ? fileValidation.validationIssues.length : 0) + (fileValidation.issues ? fileValidation.issues.length : 0);
    if (totalIssues === 0) {
      console.log(`\n🎉 Validation PASSED - Data matches PSA official standards!`);
      console.log(`\n📌 Official PSA PSGC Reference: ${PSA_PSGC_URL}`);
      console.log(`   PSA Official Counts (as of September 30, 2025):`);
      console.log(`   - Regions: ${PSA_STANDARDS.regions.exact}`);
      console.log(`   - Provinces: ${PSA_STANDARDS.provinces.exact}`);
      console.log(`   - Cities: ${PSA_STANDARDS.cities.exact} (33 HUCs + 116 other cities: 5 ICCs + 111 CCs)`);
      console.log(`   - Municipalities: ${PSA_STANDARDS.municipalities.exact}`);
      console.log(`   - Barangays: ${PSA_STANDARDS.barangays.exact}`);
    } else {
      console.log(`\n⚠️  Validation found ${totalIssues} issue(s) - Review the details above`);
      console.log(`\n📌 For official PSGC data and updates, visit: ${PSA_PSGC_URL}`);
      console.log(`   Latest updates as of September 30, 2025`);
      console.log(`   Note: 2025 updates include name corrections and Sulu transfer to Region IX`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Validation error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  validate();
}

module.exports = { validateDataFile, validateDatabase };

