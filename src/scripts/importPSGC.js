/**
 * PSGC Data Import Script
 * 
 * This script imports PSGC data from CSV/JSON files into the database.
 * 
 * Usage:
 *   node src/scripts/importPSGC.js <data-file> [--format csv|json]
 * 
 * Data file should contain PSGC data from PSA in the following format:
 * - For CSV: columns should match database schema
 * - For JSON: array of objects matching database schema
 */

const db = require('../database/db');
const fs = require('fs');
const path = require('path');

// Helper function to insert region
async function insertRegion(data) {
  await db.run(`
    INSERT OR REPLACE INTO regions (code, name, island_group_code, island_group_name, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    data.code,
    data.name,
    data.island_group_code || null,
    data.island_group_name || null
  ]);
}

// Helper function to insert province
async function insertProvince(data) {
  await db.run(`
    INSERT OR REPLACE INTO provinces (code, name, region_code, island_group_code, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    data.code,
    data.name,
    data.region_code,
    data.island_group_code || null
  ]);
}

// Helper function to insert city
async function insertCity(data) {
  await db.run(`
    INSERT OR REPLACE INTO cities (
      code, name, province_code, district_code, region_code, 
      city_class, income_class, is_capital, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    data.code,
    data.name,
    data.province_code || null,
    data.district_code || null,
    data.region_code,
    data.city_class || null,
    data.income_class || null,
    data.is_capital || 0
  ]);
}

// Helper function to insert district
async function insertDistrict(data) {
  await db.run(`
    INSERT OR REPLACE INTO districts (
      code, name, province_code, updated_at
    )
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    data.code,
    data.name,
    data.province_code
  ]);
}

// Helper function to insert municipality
async function insertMunicipality(data) {
  await db.run(`
    INSERT OR REPLACE INTO municipalities (
      code, name, province_code, district_code, region_code,
      income_class, is_capital, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    data.code,
    data.name,
    data.province_code,
    data.district_code || null,
    data.region_code,
    data.income_class || null,
    data.is_capital || 0
  ]);
}

// Helper function to insert barangay
// PSGC Pattern: Barangay code = XXYYZZAAA (9 digits, last 3 are NOT zeros)
// Parent City/Municipality = XXYYZZ000 (first 6 digits + 000)
async function insertBarangay(data) {
  // Extract city/municipality code from barangay code (first 6 digits + 000)
  // According to PSGC: XXYYZZ000 = City/Municipality code
  const cityMuniCode = data.code.substring(0, 6) + '000';
  
  // Determine if parent is a city or municipality
  let cityCode = data.city_code || null;
  let municipalityCode = data.municipality_code || null;
  
  // If not explicitly set, check if parent exists as city or municipality
  if (!cityCode && !municipalityCode) {
    const cityExists = await db.get('SELECT code FROM cities WHERE code = ?', [cityMuniCode]);
    const muniExists = await db.get('SELECT code FROM municipalities WHERE code = ?', [cityMuniCode]);
    
    if (cityExists) {
      cityCode = cityMuniCode;
    } else if (muniExists) {
      municipalityCode = cityMuniCode;
    }
  }
  
  await db.run(`
    INSERT OR REPLACE INTO barangays (
      code, name, city_code, municipality_code, 
      province_code, region_code, urban_rural, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    data.code,
    data.name,
    cityCode,
    municipalityCode,
    data.province_code,
    data.region_code,
    data.urban_rural || null
  ]);
}

// Parse CSV file
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || null;
    });
    return obj;
  });
}

// Parse JSON file
function parseJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

// Normalize PSGC code to 9 digits
function normalizeCode(code) {
  if (!code) return null;
  const codeStr = String(code).trim();
  if (codeStr.length === 0) return null;
  // Pad to 9 digits, ensuring it starts with the correct prefix
  return codeStr.padStart(9, '0').substring(0, 9);
}

// Extract region code from any PSGC code
function extractRegionCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return normalized.substring(0, 2) + '0000000';
}

// Extract province code from any PSGC code
function extractProvinceCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return normalized.substring(0, 4) + '00000';
}

// Extract district code from any PSGC code (if present)
// Note: Districts are not part of standard PSGC pattern but may exist in some data
function extractDistrictCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  
  // District code pattern: 5 digits + 4 zeros (if it exists in data)
  // This is NOT part of standard PSGC but may be present
  if (normalized.match(/^\d{5}0000$/)) {
    // Make sure it's not a province (4 digits + 5 zeros)
    const provincePattern = normalized.substring(0, 4) + '00000';
    if (normalized !== provincePattern) {
      return normalized;
    }
  }
  return null;
}

// Main import function
async function importData(filePath, format = 'json') {
  console.log(`Importing data from ${filePath}...`);
  
  // Initialize database and wait for tables to be created
  console.log('Initializing database...');
  await db.initializeDatabase();
  console.log('Database initialized.\n');
  
  let data;
  if (format === 'csv') {
    data = parseCSV(filePath);
  } else {
    data = parseJSON(filePath);
  }

  console.log(`Processing ${data.length} records...\n`);
  
  let regions = 0, provinces = 0, districts = 0, cities = 0, municipalities = 0, barangays = 0;
  let errors = 0;
  const errorLog = [];

  // Separate data by type first (important for foreign keys)
  const regionsList = [];
  const provincesList = [];
  const districtsList = [];
  const citiesList = [];
  const municipalitiesList = [];
  const barangaysList = [];

  data.forEach(item => {
    const code = normalizeCode(item.code || item.Code || item.CODE);
    const type = item.type || item.Type || item.TYPE;
    const name = (item.name || item.Name || item.NAME || '').trim();
    
    if (!code || code === '000000000') {
      return;
    }

    // Normalize all codes in the item
    const normalizedItem = {
      ...item,
      code: code,
      name: name
    };

    // Extract missing codes
    if (!normalizedItem.region_code) {
      normalizedItem.region_code = extractRegionCode(code);
    } else {
      normalizedItem.region_code = normalizeCode(normalizedItem.region_code);
    }

    // Extract province code based on PSGC pattern
    // Province code = first 4 digits (XXYY) + 5 zeros = XXYY00000
    if (!normalizedItem.province_code) {
      // For any code that's not a region or province itself, extract province code
      if (!code.match(/^\d{2}0000000$/) && !code.match(/^\d{4}00000$/)) {
        // Extract province from first 4 digits: XXYY00000
        normalizedItem.province_code = extractProvinceCode(code);
      }
    } else {
      normalizedItem.province_code = normalizeCode(normalizedItem.province_code);
    }

    // Extract district code if applicable (districts are not standard PSGC but may exist)
    // District code pattern: 5 digits + 4 zeros (if present in data)
    if (!normalizedItem.district_code && code.match(/^\d{5}0000$/) && 
        !code.match(/^\d{4}00000$/) && !code.match(/^\d{2}0000000$/)) {
      normalizedItem.district_code = code;
    } else if (normalizedItem.district_code) {
      normalizedItem.district_code = normalizeCode(normalizedItem.district_code);
    }
    
    // For cities/municipalities/barangays, extract parent city/municipality code if applicable
    if (code.match(/^\d{6}000$/) || (code.match(/^\d{9}$/) && !code.match(/000$/))) {
      // City/Municipality code = first 6 digits (XXYYZZ) + 3 zeros
      const cityMuniCode = code.substring(0, 6) + '000';
      if (code.match(/^\d{9}$/) && !code.match(/000$/)) {
        // For barangays, set city_code or municipality_code based on parent
        if (!normalizedItem.city_code && !normalizedItem.municipality_code) {
          // Check if parent is a city or municipality (we'll determine this during import)
          // For now, we'll set it during the barangay import phase
        }
      }
    }

    if (normalizedItem.city_code) {
      normalizedItem.city_code = normalizeCode(normalizedItem.city_code);
    }

    if (normalizedItem.municipality_code) {
      normalizedItem.municipality_code = normalizeCode(normalizedItem.municipality_code);
    }

    // Classify by PSGC code pattern (check in order of specificity - most specific first)
    // Pattern: RR PP MM BBB (Region, Province, Municipality/City, Barangay)
    
    // 1. Region Code (XX0000000): 2 digits + 7 zeros
    // Examples: 040000000 (Region IV-A), 130000000 (NCR)
    if (type === 'Region' || code.match(/^\d{2}0000000$/)) {
      regionsList.push(normalizedItem);
    } 
    // 2. Province Code (XXYY00000): 4 digits + 5 zeros
    // Examples: 042100000 (Laguna), 072200000 (Cebu)
    else if (type === 'Province' || code.match(/^\d{4}00000$/)) {
      provincesList.push(normalizedItem);
    } 
    // 3. District Code (XXYYZ0000): 5 digits + 4 zeros (NOT standard PSGC but may exist)
    // Check this BEFORE city/municipality to avoid misclassification
    else if (type === 'District' || (code.match(/^\d{5}0000$/) && 
               !name.toLowerCase().includes('city') && 
               !name.toLowerCase().includes('region') &&
               !name.toLowerCase().includes('province'))) {
      districtsList.push(normalizedItem);
    }
    // 4. City/Municipality Code (XXYYZZ000): 6 digits + 3 zeros
    // Examples: 137404000 (Quezon City), 137602000 (Makati)
    else if (code.match(/^\d{6}000$/)) {
      // Distinguish between City and Municipality
      // More precise city detection to avoid misclassifying municipalities
      const isCity = type === 'City' || 
                     name.toLowerCase().includes('city of') || 
                     name.toLowerCase().endsWith(' city') ||
                     (name.toLowerCase().includes('city') && (
                       name.toLowerCase().includes('highly urbanized') ||
                       name.toLowerCase().includes('independent component') ||
                       name.toLowerCase().includes('component city') ||
                       name.toLowerCase().startsWith('city of')
                     )) ||
                     normalizedItem.city_class ||
                     normalizedItem.cityCode ||
                     normalizedItem.city_classification;
      
      if (isCity) {
        citiesList.push(normalizedItem);
      } else {
        municipalitiesList.push(normalizedItem);
      }
    } 
    // 5. Barangay Code (XXYYZZAAA): 9 digits, last 3 digits are NOT all zeros
    // Examples: 137602006 (Barangay San Lorenzo, Makati)
    // Pattern: RR PP MM BBB where BBB != 000
    // Must be exactly 9 digits and NOT end in 000
    else if (type === 'Barangay' || (code.match(/^\d{9}$/) && !code.match(/000$/))) {
      barangaysList.push(normalizedItem);
    }
    // Unclassified items (should not happen with valid PSGC data)
    else {
      // Log unclassified items for debugging
      console.warn(`⚠️  Unclassified item: code=${code}, name="${name}", type="${type}"`);
    }
  });

  // Import in order (regions first, then provinces, etc.)
  console.log(`Importing ${regionsList.length} regions...`);
  for (const item of regionsList) {
    try {
      await insertRegion(item);
      regions++;
    } catch (error) {
      errors++;
      const errorMsg = `Error inserting region ${item.code} (${item.name}): ${error.message}`;
      errorLog.push(errorMsg);
      if (errors <= 10) console.error(`  ${errorMsg}`);
    }
  }
  console.log(`  ✓ Imported ${regions} regions\n`);

  console.log(`Importing ${provincesList.length} provinces...`);
  for (const item of provincesList) {
    try {
      // Ensure region exists, create if needed
      if (item.region_code) {
        const regionExists = await db.get('SELECT code FROM regions WHERE code = ?', [item.region_code]);
        if (!regionExists) {
          // Create missing region
          await insertRegion({
            code: item.region_code,
            name: `Region ${item.region_code.substring(0, 2)}`,
            island_group_code: null,
            island_group_name: null
          });
        }
      }
      await insertProvince(item);
      provinces++;
    } catch (error) {
      errors++;
      const errorMsg = `Error inserting province ${item.code} (${item.name}): ${error.message}`;
      errorLog.push(errorMsg);
      if (errors <= 20) console.error(`  ${errorMsg}`);
    }
  }
  console.log(`  ✓ Imported ${provinces} provinces\n`);

  console.log(`Importing ${districtsList.length} districts...`);
  for (const item of districtsList) {
    try {
      // Ensure province exists
      if (item.province_code) {
        const provinceExists = await db.get('SELECT code FROM provinces WHERE code = ?', [item.province_code]);
        if (!provinceExists) {
          errors++;
          continue;
        }
      }
      await insertDistrict(item);
      districts++;
    } catch (error) {
      errors++;
      const errorMsg = `Error inserting district ${item.code} (${item.name}): ${error.message}`;
      errorLog.push(errorMsg);
      if (errors <= 25) console.error(`  ${errorMsg}`);
    }
  }
  console.log(`  ✓ Imported ${districts} districts\n`);

  console.log(`Importing ${citiesList.length} cities...`);
  for (const item of citiesList) {
    try {
      // Ensure region exists or auto-extract it
      if (!item.region_code) {
        item.region_code = extractRegionCode(item.code);
      }
      if (item.region_code) {
        const regionExists = await db.get('SELECT code FROM regions WHERE code = ?', [item.region_code]);
        if (!regionExists) {
          await insertRegion({
            code: item.region_code,
            name: `Region ${item.region_code.substring(0, 2)}`,
            island_group_code: null,
            island_group_name: null
          });
        }
      }
      // Ensure province exists or auto-extract it
      if (!item.province_code) {
        item.province_code = extractProvinceCode(item.code);
      }
      if (item.province_code) {
        const provinceExists = await db.get('SELECT code FROM provinces WHERE code = ?', [item.province_code]);
        if (!provinceExists) {
          // Try to create province if region exists
          if (item.region_code) {
            try {
              await insertProvince({
                code: item.province_code,
                name: `Province ${item.province_code.substring(0, 4)}`,
                region_code: item.region_code,
                island_group_code: null
              });
            } catch (provError) {
              // If province creation fails, skip this city
              errors++;
              const errorMsg = `Error inserting city ${item.code} (${item.name}): Cannot create missing province ${item.province_code}`;
              errorLog.push(errorMsg);
              continue;
            }
          } else {
            errors++;
            const errorMsg = `Error inserting city ${item.code} (${item.name}): Missing province ${item.province_code} and region`;
            errorLog.push(errorMsg);
            continue;
          }
        }
      }
      // Clear district_code if it doesn't exist (foreign key constraint)
      if (item.district_code) {
        const districtExists = await db.get('SELECT code FROM districts WHERE code = ?', [item.district_code]);
        if (!districtExists) {
          item.district_code = null;
        }
      }
      await insertCity(item);
      cities++;
    } catch (error) {
      errors++;
      const errorMsg = `Error inserting city ${item.code} (${item.name}): ${error.message}`;
      errorLog.push(errorMsg);
    }
  }
  console.log(`  ✓ Imported ${cities} cities\n`);

  console.log(`Importing ${municipalitiesList.length} municipalities...`);
  for (const item of municipalitiesList) {
    try {
      // Ensure region exists or auto-extract it
      if (!item.region_code) {
        item.region_code = extractRegionCode(item.code);
      }
      if (item.region_code) {
        const regionExists = await db.get('SELECT code FROM regions WHERE code = ?', [item.region_code]);
        if (!regionExists) {
          await insertRegion({
            code: item.region_code,
            name: `Region ${item.region_code.substring(0, 2)}`,
            island_group_code: null,
            island_group_name: null
          });
        }
      }
      // Ensure province exists or auto-extract it
      if (!item.province_code) {
        item.province_code = extractProvinceCode(item.code);
      }
      if (item.province_code) {
        const provinceExists = await db.get('SELECT code FROM provinces WHERE code = ?', [item.province_code]);
        if (!provinceExists) {
          // Try to create province if region exists
          if (item.region_code) {
            try {
              await insertProvince({
                code: item.province_code,
                name: `Province ${item.province_code.substring(0, 4)}`,
                region_code: item.region_code,
                island_group_code: null
              });
            } catch (provError) {
              // Province creation failed, skip this municipality
              errors++;
              const errorMsg = `Error inserting municipality ${item.code} (${item.name}): Cannot create missing province ${item.province_code}`;
              errorLog.push(errorMsg);
              continue;
            }
          } else {
            errors++;
            const errorMsg = `Error inserting municipality ${item.code} (${item.name}): Missing province ${item.province_code} and region`;
            errorLog.push(errorMsg);
            continue;
          }
        }
      }
      // Clear district_code if it doesn't exist (foreign key constraint)
      if (item.district_code) {
        const districtExists = await db.get('SELECT code FROM districts WHERE code = ?', [item.district_code]);
        if (!districtExists) {
          item.district_code = null;
        }
      }
      await insertMunicipality(item);
      municipalities++;
    } catch (error) {
      errors++;
      const errorMsg = `Error inserting municipality ${item.code} (${item.name}): ${error.message}`;
      errorLog.push(errorMsg);
    }
  }
  console.log(`  ✓ Imported ${municipalities} municipalities\n`);

  console.log(`Importing ${barangaysList.length} barangays...`);
  for (const item of barangaysList) {
    try {
      // Ensure region exists or auto-extract it
      if (!item.region_code) {
        item.region_code = extractRegionCode(item.code);
      }
      if (item.region_code) {
        const regionExists = await db.get('SELECT code FROM regions WHERE code = ?', [item.region_code]);
        if (!regionExists) {
          await insertRegion({
            code: item.region_code,
            name: `Region ${item.region_code.substring(0, 2)}`,
            island_group_code: null,
            island_group_name: null
          });
        }
      }
      
      // Ensure province_code is set (extract from code if missing)
      if (!item.province_code) {
        item.province_code = extractProvinceCode(item.code);
      }
      
      // Try to ensure province exists
      if (item.province_code) {
        const provinceExists = await db.get('SELECT code FROM provinces WHERE code = ?', [item.province_code]);
        if (!provinceExists) {
          // Try to create a basic province entry if we have region_code
          if (item.region_code) {
            try {
              await insertProvince({
                code: item.province_code,
                name: `Province ${item.province_code.substring(0, 4)}`,
                region_code: item.region_code,
                island_group_code: null
              });
            } catch (provError) {
              // If province creation fails, log but continue (might be duplicate or other issue)
              errors++;
              const errorMsg = `Error inserting barangay ${item.code} (${item.name}): Cannot create missing province ${item.province_code} - ${provError.message}`;
              errorLog.push(errorMsg);
              continue;
            }
          } else {
            errors++;
            const errorMsg = `Error inserting barangay ${item.code} (${item.name}): Missing province ${item.province_code} and region`;
            errorLog.push(errorMsg);
            continue;
          }
        }
      } else {
        errors++;
        const errorMsg = `Error inserting barangay ${item.code} (${item.name}): Cannot extract province code`;
        errorLog.push(errorMsg);
        continue;
      }
      
      await insertBarangay(item);
      barangays++;
    } catch (error) {
      errors++;
      const errorMsg = `Error inserting barangay ${item.code} (${item.name}): ${error.message}`;
      errorLog.push(errorMsg);
    }
  }
  console.log(`  ✓ Imported ${barangays} barangays\n`);

  console.log('✅ Import completed!');
  console.log(`- Regions: ${regions}`);
  console.log(`- Provinces: ${provinces}`);
  console.log(`- Districts: ${districts}`);
  console.log(`- Cities: ${cities}`);
  console.log(`- Municipalities: ${municipalities}`);
  console.log(`- Barangays: ${barangays}`);
  console.log(`Total: ${regions + provinces + districts + cities + municipalities + barangays} records`);
  
  // Compare with PSA 2025 standards
  console.log('\n📊 Comparison with PSA 2025 Standards:');
  const PSA_2025 = {
    regions: 18,
    provinces: 82,
    cities: 149,
    municipalities: 1493,
    barangays: 42011
  };
  
  const compareCount = (name, actual, expected) => {
    const diff = actual - expected;
    if (diff === 0) {
      console.log(`  ✅ ${name}: ${actual} (EXACT MATCH)`);
    } else {
      console.log(`  ${diff > 0 ? '⚠️' : '❌'} ${name}: ${actual} (expected: ${expected}, difference: ${diff > 0 ? '+' : ''}${diff})`);
    }
  };
  
  compareCount('Regions', regions, PSA_2025.regions);
  compareCount('Provinces', provinces, PSA_2025.provinces);
  compareCount('Cities', cities, PSA_2025.cities);
  compareCount('Municipalities', municipalities, PSA_2025.municipalities);
  compareCount('Barangays', barangays, PSA_2025.barangays);
  
  if (errors > 0) {
    console.log(`\n⚠️  ${errors} errors encountered during import`);
    console.log('\n📋 Error Details:');
    const errorsToShow = Math.min(errorLog.length, 50);
    for (let i = 0; i < errorsToShow; i++) {
      console.log(`  ${i + 1}. ${errorLog[i]}`);
    }
    if (errorLog.length > 50) {
      console.log(`\n... and ${errorLog.length - 50} more errors (showing first 50)`);
    }
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node src/scripts/importPSGC.js <data-file> [--format csv|json]');
    process.exit(1);
  }

  const filePath = args[0];
  const formatIndex = args.indexOf('--format');
  const format = formatIndex !== -1 ? args[formatIndex + 1] : 'json';

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File ${filePath} not found`);
    process.exit(1);
  }

  importData(filePath, format)
    .then(() => {
      console.log('\n✅ Database import successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error importing data:', error);
      process.exit(1);
    });
}

module.exports = { importData };
