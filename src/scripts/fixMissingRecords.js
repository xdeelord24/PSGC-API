/**
 * Fix Missing PSGC Records
 * 
 * This script identifies and adds missing records to make the data complete
 * according to PSA 2025 standards:
 * - 18 Regions
 * - 82 Provinces
 * - 149 Cities
 * - 1,493 Municipalities
 * - 42,011 Barangays
 */

const fs = require('fs');
const path = require('path');

// PSA 2025 Standards
const PSA_STANDARDS = {
  regions: 18,
  provinces: 82,
  cities: 149,
  municipalities: 1493,
  barangays: 42011
};

// Normalize PSGC code
function normalizeCode(code) {
  if (!code) return null;
  return String(code).padStart(9, '0').substring(0, 9);
}

// Classify entity type
function classifyEntity(item) {
  const code = normalizeCode(item.code);
  if (!code) return null;
  
  if (code.match(/^\d{2}0000000$/)) return 'region';
  if (code.match(/^\d{4}00000$/)) return 'province';
  if (code.match(/^\d{6}000$/)) {
    const name = (item.name || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const isExplicitMunicipality = name.includes('municipality of') ||
                                   (name.includes('municipality') && !name.includes('city'));
    const isCity = !isExplicitMunicipality && (
      type === 'city' ||
      name.includes('city of') ||
      name.endsWith(' city') ||
      name.includes('city') ||
      item.city_class ||
      item.cityClass ||
      item.city_classification ||
      item.cityCode
    );
    return isCity ? 'city' : 'municipality';
  }
  if (code.match(/^\d{9}$/) && !code.match(/000$/)) return 'barangay';
  return null;
}

// Main function
function fixMissingRecords(completeFile, sourceFile, outputFile) {
  console.log('🔧 Fixing Missing PSGC Records\n');
  
  // Read both files
  const completeData = JSON.parse(fs.readFileSync(completeFile, 'utf-8'));
  const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
  
  console.log(`📁 Complete file: ${completeData.length} records`);
  console.log(`📁 Source file: ${sourceData.length} records\n`);
  
  // Classify all records
  const completeByType = {
    regions: [],
    provinces: [],
    cities: [],
    municipalities: [],
    barangays: []
  };
  
  const sourceByType = {
    regions: [],
    provinces: [],
    cities: [],
    municipalities: [],
    barangays: []
  };
  
  completeData.forEach(item => {
    const type = classifyEntity(item);
    if (type && completeByType[type + 's']) {
      completeByType[type + 's'].push(item);
    }
  });
  
  sourceData.forEach(item => {
    const type = classifyEntity(item);
    if (type && sourceByType[type + 's']) {
      sourceByType[type + 's'].push(item);
    }
  });
  
  console.log('📊 Current counts:');
  console.log(`  Regions: ${completeByType.regions.length} (need ${PSA_STANDARDS.regions})`);
  console.log(`  Provinces: ${completeByType.provinces.length} (need ${PSA_STANDARDS.provinces})`);
  console.log(`  Cities: ${completeByType.cities.length} (need ${PSA_STANDARDS.cities})`);
  console.log(`  Municipalities: ${completeByType.municipalities.length} (need ${PSA_STANDARDS.municipalities})`);
  console.log(`  Barangays: ${completeByType.barangays.length} (need ${PSA_STANDARDS.barangays})\n`);
  
  // Create code sets for quick lookup (use Map to keep best record)
  const completeMap = new Map();
  completeData.forEach(item => {
    const code = normalizeCode(item.code);
    if (code) {
      completeMap.set(code, item);
    }
  });
  
  // Find missing records from source file and deduplicate
  const missingRecords = [];
  const sourceMap = new Map();
  
  sourceData.forEach(item => {
    const code = normalizeCode(item.code);
    if (code) {
      if (!completeMap.has(code)) {
        // This is a missing record
        if (!sourceMap.has(code)) {
          sourceMap.set(code, item);
          missingRecords.push(item);
        }
      } else {
        // Record exists, but might need to merge/update
        // For now, keep the one from complete file
      }
    }
  });
  
  console.log(`🔍 Found ${missingRecords.length} missing records in source file\n`);
  
  // Combine: use complete data as base, add missing from source
  const fixedData = [...completeData];
  missingRecords.forEach(item => {
    const code = normalizeCode(item.code);
    if (code && !completeMap.has(code)) {
      fixedData.push(item);
      completeMap.set(code, item); // Track added
    }
  });
  
  // Re-classify to verify
  const fixedByType = {
    regions: [],
    provinces: [],
    cities: [],
    municipalities: [],
    barangays: []
  };
  
  fixedData.forEach(item => {
    const type = classifyEntity(item);
    if (type && fixedByType[type + 's']) {
      fixedByType[type + 's'].push(item);
    }
  });
  
  console.log('📊 Fixed counts:');
  console.log(`  Regions: ${fixedByType.regions.length} (need ${PSA_STANDARDS.regions})`);
  console.log(`  Provinces: ${fixedByType.provinces.length} (need ${PSA_STANDARDS.provinces})`);
  console.log(`  Cities: ${fixedByType.cities.length} (need ${PSA_STANDARDS.cities})`);
  console.log(`  Municipalities: ${fixedByType.municipalities.length} (need ${PSA_STANDARDS.municipalities})`);
  console.log(`  Barangays: ${fixedByType.barangays.length} (need ${PSA_STANDARDS.barangays})\n`);
  
  // Show what was added
  if (missingRecords.length > 0) {
    console.log('✅ Added missing records:');
    const addedByType = {};
    missingRecords.forEach(item => {
      const type = classifyEntity(item);
      if (type) {
        if (!addedByType[type]) addedByType[type] = [];
        addedByType[type].push(item);
      }
    });
    
    Object.keys(addedByType).forEach(type => {
      console.log(`  ${type}: ${addedByType[type].length}`);
      addedByType[type].slice(0, 5).forEach(item => {
        console.log(`    - ${item.code}: ${item.name}`);
      });
      if (addedByType[type].length > 5) {
        console.log(`    ... and ${addedByType[type].length - 5} more`);
      }
    });
  }
  
  // Save fixed data
  fs.writeFileSync(outputFile, JSON.stringify(fixedData, null, 2));
  console.log(`\n💾 Fixed data saved to: ${outputFile}`);
  console.log(`   Total records: ${fixedData.length}`);
  
  return fixedData;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const completeFile = args[0] || 'data/psgc-data-complete.json';
  const sourceFile = args[1] || 'data/psgc-data-cleaned.json';
  const outputFile = args[2] || 'data/psgc-data-fixed.json';
  
  if (!fs.existsSync(completeFile)) {
    console.error(`Error: ${completeFile} not found`);
    process.exit(1);
  }
  
  if (!fs.existsSync(sourceFile)) {
    console.error(`Error: ${sourceFile} not found`);
    process.exit(1);
  }
  
  try {
    fixMissingRecords(completeFile, sourceFile, outputFile);
    console.log('\n✅ Fix completed!');
    console.log(`\nNext steps:`);
    console.log(`1. Validate: npm run validate ${outputFile}`);
    console.log(`2. Import: npm run import ${outputFile}`);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { fixMissingRecords };

