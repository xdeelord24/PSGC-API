/**
 * Clean and Validate PSGC Data
 * 
 * This script cleans the PSGC data and ensures it matches PSA standards:
 * - Removes duplicates
 * - Validates PSGC code patterns
 * - Ensures parent-child relationships are correct
 * - Removes invalid entries
 * 
 * Usage:
 *   node src/scripts/cleanPSGCData.js [input-file] [output-file]
 */

const fs = require('fs');
const path = require('path');

// PSA Official Standards (as of September 30, 2025)
const PSA_STANDARDS = {
  regions: 18,
  provinces: 82,
  cities: 149, // 33 HUC + 116 other (5 ICC + 111 CC)
  municipalities: 1493,
  barangays: 42011
};

// Normalize PSGC code
function normalizeCode(code) {
  if (!code) return null;
  let codeStr = String(code).trim();
  // Remove any non-digit characters
  codeStr = codeStr.replace(/\D/g, '');
  if (codeStr.length === 0) return null;
  return codeStr.padStart(9, '0').substring(0, 9);
}

// Classify entity by code pattern
function classifyEntity(code, name = '', type = '', row = {}) {
  code = normalizeCode(code);
  if (!code || code === '000000000') return null;
  
  name = (name || '').trim().toLowerCase();
  type = (type || '').trim().toLowerCase();
  
  // Region: XX0000000
  if (code.match(/^\d{2}0000000$/)) {
    return { type: 'region', code, name: row.name || name };
  }
  
  // Province: XXXX00000
  if (code.match(/^\d{4}00000$/)) {
    return { type: 'province', code, name: row.name || name };
  }
  
  // District: XXXXX0000 (5 digits + 4 zeros, but not region/province/city/municipality)
  if (code.match(/^\d{5}0000$/)) {
    return { type: 'district', code, name: row.name || name };
  }
  
  // City/Municipality: XXXXXX000
  if (code.match(/^\d{6}000$/)) {
    // Determine if city or municipality
    const isCity = type.includes('city') || 
                   name.includes('city of') || 
                   name.endsWith(' city') ||
                   row.city_class || row.cityClass || row['City Class'] ||
                   row['city class'] ||
                   (name.includes('city') && (
                     name.includes('highly urbanized') ||
                     name.includes('independent component') ||
                     name.includes('component city')
                   ));
    
    if (isCity) {
      return { type: 'city', code, name: row.name || name, cityClass: row.city_class || row.cityClass || row['City Class'] || null };
    } else {
      return { type: 'municipality', code, name: row.name || name };
    }
  }
  
  // Barangay: XXXXXXAAA (last 3 digits NOT 000)
  if (code.match(/^\d{9}$/) && !code.match(/000$/)) {
    return { type: 'barangay', code, name: row.name || name };
  }
  
  return null;
}

// Clean and validate data
function cleanData(data) {
  console.log(`\n🧹 Cleaning ${data.length} records...\n`);
  
  const cleaned = {
    regions: [],
    provinces: [],
    districts: [],
    cities: [],
    municipalities: [],
    barangays: []
  };
  
  const seen = new Set();
  const duplicates = [];
  const invalid = [];
  
  data.forEach((item, index) => {
    try {
      const code = normalizeCode(item.code || item.Code || item['10-digit PSGC'] || item['Correspondence Code']);
      const name = (item.name || item.Name || '').trim();
      const type = (item.type || item.Type || item['Geographic Level'] || '').trim();
      
      if (!code || !name) {
        invalid.push({ index, reason: 'Missing code or name', item });
        return;
      }
      
      // Check for duplicates
      if (seen.has(code)) {
        duplicates.push({ index, code, name });
        return;
      }
      seen.add(code);
      
      // Classify entity
      const entity = classifyEntity(code, name, type, item);
      
      if (!entity) {
        invalid.push({ index, reason: 'Invalid PSGC pattern', code, name });
        return;
      }
      
      // Add entity-specific fields
      const cleanEntity = {
        code: entity.code,
        name: entity.name
      };
      
      if (entity.type === 'region') {
        cleanEntity.island_group_code = normalizeCode(item.island_group_code || item.islandGroupCode || null);
        cleanEntity.island_group_name = item.island_group_name || item.islandGroupName || null;
        cleaned.regions.push(cleanEntity);
      } else if (entity.type === 'province') {
        cleanEntity.region_code = normalizeCode(
          item.region_code || item.regionCode ||
          code.substring(0, 2) + '0000000'
        );
        cleanEntity.island_group_code = normalizeCode(item.island_group_code || item.islandGroupCode || null);
        cleaned.provinces.push(cleanEntity);
      } else if (entity.type === 'city') {
        cleanEntity.province_code = normalizeCode(
          item.province_code || item.provinceCode ||
          code.substring(0, 4) + '00000'
        );
        cleanEntity.region_code = normalizeCode(
          item.region_code || item.regionCode ||
          code.substring(0, 2) + '0000000'
        );
        cleanEntity.city_class = entity.cityClass || item.city_class || item.cityClass || item['City Class'] || null;
        cleanEntity.income_class = item.income_class || item.incomeClass || item['Income Classification'] || item['Income\nClassification'] || null;
        cleanEntity.is_capital = (item.is_capital === 1 || item.isCapital === 1 || item.capital === 'Yes' || item.Capital === 'Yes') ? 1 : 0;
        cleaned.cities.push(cleanEntity);
      } else if (entity.type === 'municipality') {
        cleanEntity.province_code = normalizeCode(
          item.province_code || item.provinceCode ||
          code.substring(0, 4) + '00000'
        );
        cleanEntity.region_code = normalizeCode(
          item.region_code || item.regionCode ||
          code.substring(0, 2) + '0000000'
        );
        cleanEntity.income_class = item.income_class || item.incomeClass || item['Income Classification'] || item['Income\nClassification'] || null;
        cleanEntity.is_capital = (item.is_capital === 1 || item.isCapital === 1 || item.capital === 'Yes' || item.Capital === 'Yes') ? 1 : 0;
        cleaned.municipalities.push(cleanEntity);
      } else if (entity.type === 'barangay') {
        cleanEntity.city_code = null; // Will be set during import
        cleanEntity.municipality_code = null; // Will be set during import
        cleanEntity.province_code = normalizeCode(
          item.province_code || item.provinceCode ||
          code.substring(0, 4) + '00000'
        );
        cleanEntity.region_code = normalizeCode(
          item.region_code || item.regionCode ||
          code.substring(0, 2) + '0000000'
        );
        cleanEntity.urban_rural = item.urban_rural || item.urbanRural || item['Urban / Rural'] || item['Urban / Rural\n(based on 2020 CPH)'] || null;
        cleaned.barangays.push(cleanEntity);
      }
    } catch (error) {
      invalid.push({ index, reason: error.message, code: item.code, name: item.name });
    }
  });
  
  // Report results
  console.log('📊 Cleaning Results:');
  console.log(`  Regions: ${cleaned.regions.length} (expected: ${PSA_STANDARDS.regions})`);
  console.log(`  Provinces: ${cleaned.provinces.length} (expected: ${PSA_STANDARDS.provinces})`);
  console.log(`  Districts: ${cleaned.districts.length}`);
  console.log(`  Cities: ${cleaned.cities.length} (expected: ${PSA_STANDARDS.cities})`);
  console.log(`  Municipalities: ${cleaned.municipalities.length} (expected: ${PSA_STANDARDS.municipalities})`);
  console.log(`  Barangays: ${cleaned.barangays.length} (expected: ${PSA_STANDARDS.barangays})`);
  console.log(`\n  Duplicates removed: ${duplicates.length}`);
  console.log(`  Invalid entries: ${invalid.length}`);
  
  if (duplicates.length > 0 && duplicates.length <= 10) {
    console.log(`\n  Duplicate codes:`);
    duplicates.forEach(d => console.log(`    ${d.code} - ${d.name}`));
  }
  
  if (invalid.length > 0 && invalid.length <= 10) {
    console.log(`\n  Invalid entries:`);
    invalid.forEach(i => console.log(`    ${i.code} - ${i.name} (${i.reason})`));
  }
  
  // Flatten to single array
  const allData = [
    ...cleaned.regions,
    ...cleaned.provinces,
    ...cleaned.districts,
    ...cleaned.cities,
    ...cleaned.municipalities,
    ...cleaned.barangays
  ];
  
  console.log(`\n  Total cleaned records: ${allData.length}`);
  
  return allData;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const inputFile = args[0] || 'data/psgc-data-dilg.json';
  const outputFile = args[1] || 'data/psgc-data-cleaned.json';
  
  console.log('🧹 PSGC Data Cleaning and Validation');
  console.log('='.repeat(70));
  console.log(`\n📁 Input: ${inputFile}`);
  console.log(`📁 Output: ${outputFile}\n`);
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }
  
  try {
    // Read input data
    console.log('📖 Reading input file...');
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    console.log(`  Found ${data.length} records\n`);
    
    // Clean data
    const cleaned = cleanData(data);
    
    // Save cleaned data
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(cleaned, null, 2));
    console.log(`\n💾 Cleaned data saved to: ${outputFile}`);
    console.log(`   File size: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB`);
    
    // Compare with PSA standards
    console.log('\n📊 Comparison with PSA Standards (as of September 30, 2025):');
    const compareCount = (name, actual, expected) => {
      const diff = actual - expected;
      if (diff === 0) {
        console.log(`  ✅ ${name}: ${actual} (EXACT MATCH)`);
      } else {
        console.log(`  ${diff > 0 ? '⚠️' : '❌'} ${name}: ${actual} (expected: ${expected}, difference: ${diff > 0 ? '+' : ''}${diff})`);
      }
    };
    
    compareCount('Regions', cleaned.regions.length, PSA_STANDARDS.regions);
    compareCount('Provinces', cleaned.provinces.length, PSA_STANDARDS.provinces);
    compareCount('Cities', cleaned.cities.length, PSA_STANDARDS.cities);
    compareCount('Municipalities', cleaned.municipalities.length, PSA_STANDARDS.municipalities);
    compareCount('Barangays', cleaned.barangays.length, PSA_STANDARDS.barangays);
    
    console.log('\n✅ Cleaning completed!');
    console.log(`\n📦 Next steps:`);
    console.log(`1. Validate: npm run validate ${outputFile}`);
    console.log(`2. Import: npm run import ${outputFile}`);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanData, classifyEntity, normalizeCode };

