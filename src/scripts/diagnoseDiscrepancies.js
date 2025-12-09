/**
 * Diagnostic Script to Identify PSGC Data Discrepancies
 * 
 * This script helps identify what's missing or misclassified
 */

const db = require('../database/db');
const fs = require('fs');

// PSA 2025 Official Standards
const PSA_2025 = {
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

async function diagnose() {
  console.log('🔍 Diagnosing PSGC Data Discrepancies\n');
  console.log('='.repeat(60));
  
  await db.initializeDatabase();
  
  // Get current database counts
  const dbCounts = {
    regions: (await db.all('SELECT COUNT(*) as c FROM regions'))[0].c,
    provinces: (await db.all('SELECT COUNT(*) as c FROM provinces'))[0].c,
    cities: (await db.all('SELECT COUNT(*) as c FROM cities'))[0].c,
    municipalities: (await db.all('SELECT COUNT(*) as c FROM municipalities'))[0].c,
    barangays: (await db.all('SELECT COUNT(*) as c FROM barangays'))[0].c
  };
  
  console.log('\n📊 Current Database Counts:');
  console.log(`  Regions: ${dbCounts.regions} (PSA: ${PSA_2025.regions}, diff: ${dbCounts.regions - PSA_2025.regions})`);
  console.log(`  Provinces: ${dbCounts.provinces} (PSA: ${PSA_2025.provinces}, diff: ${dbCounts.provinces - PSA_2025.provinces})`);
  console.log(`  Cities: ${dbCounts.cities} (PSA: ${PSA_2025.cities}, diff: ${dbCounts.cities - PSA_2025.cities})`);
  console.log(`  Municipalities: ${dbCounts.municipalities} (PSA: ${PSA_2025.municipalities}, diff: ${dbCounts.municipalities - PSA_2025.municipalities})`);
  console.log(`  Barangays: ${dbCounts.barangays} (PSA: ${PSA_2025.barangays}, diff: ${dbCounts.barangays - PSA_2025.barangays})`);
  
  // Analyze data file
  const filePath = process.argv[2] || 'data/psgc-data.json';
  if (!fs.existsSync(filePath)) {
    console.log(`\n⚠️  Data file not found: ${filePath}`);
    return;
  }
  
  console.log(`\n📁 Analyzing data file: ${filePath}`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  const fileCounts = {
    regions: 0,
    provinces: 0,
    cities: 0,
    municipalities: 0,
    barangays: 0,
    districts: 0,
    unknown: 0
  };
  
  const cityMuniItems = [];
  
  data.forEach(item => {
    const code = normalizeCode(item.code);
    const name = (item.name || '').trim();
    const type = item.type || '';
    
    if (!code || code === '000000000') return;
    
    if (code.match(/^\d{2}0000000$/)) {
      fileCounts.regions++;
    } else if (code.match(/^\d{4}00000$/)) {
      fileCounts.provinces++;
    } else if (code.match(/^\d{5}0000$/)) {
      fileCounts.districts++;
    } else if (code.match(/^\d{6}000$/)) {
      // Collect all city/municipality items for analysis
      cityMuniItems.push({ code, name, type, item });
      const isCity = type === 'City' || 
                     name.toLowerCase().includes('city of') || 
                     name.toLowerCase().endsWith(' city') ||
                     (name.toLowerCase().includes('city') && (
                       name.toLowerCase().includes('highly urbanized') ||
                       name.toLowerCase().includes('independent component') ||
                       name.toLowerCase().includes('component city')
                     ));
      
      if (isCity) {
        fileCounts.cities++;
      } else {
        fileCounts.municipalities++;
      }
    } else if (code.match(/^\d{9}$/) && !code.match(/000$/)) {
      fileCounts.barangays++;
    } else {
      fileCounts.unknown++;
    }
  });
  
  console.log('\n📊 Data File Classification:');
  console.log(`  Regions: ${fileCounts.regions}`);
  console.log(`  Provinces: ${fileCounts.provinces}`);
  console.log(`  Districts: ${fileCounts.districts}`);
  console.log(`  Cities: ${fileCounts.cities}`);
  console.log(`  Municipalities: ${fileCounts.municipalities}`);
  console.log(`  Barangays: ${fileCounts.barangays}`);
  console.log(`  Unknown: ${fileCounts.unknown}`);
  
  // Check for potential misclassifications
  console.log('\n🔍 Potential Issues:');
  
  // Check cities vs municipalities
  const cityDiff = fileCounts.cities - PSA_2025.cities;
  const muniDiff = fileCounts.municipalities - PSA_2025.municipalities;
  
  if (cityDiff !== 0 || muniDiff !== 0) {
    console.log(`\n  ⚠️  City/Municipality Classification Issue:`);
    console.log(`     Cities: ${fileCounts.cities} (need ${PSA_2025.cities}, diff: ${cityDiff})`);
    console.log(`     Municipalities: ${fileCounts.municipalities} (need ${PSA_2025.municipalities}, diff: ${muniDiff})`);
    console.log(`     Total City/Muni items in file: ${cityMuniItems.length}`);
    console.log(`     Expected total: ${PSA_2025.cities + PSA_2025.municipalities}`);
    console.log(`     Actual total: ${fileCounts.cities + fileCounts.municipalities}`);
    
    // Show borderline cases (items that might be misclassified)
    console.log(`\n  📋 Sample City/Municipality items (first 20):`);
    cityMuniItems.slice(0, 20).forEach((item, idx) => {
      const isCity = item.name.toLowerCase().includes('city');
      console.log(`     ${idx + 1}. ${item.code} - "${item.name}" (type: "${item.type}", has 'city': ${isCity})`);
    });
  }
  
  // Check if items are being skipped during import
  const dbCityMuniTotal = dbCounts.cities + dbCounts.municipalities;
  const fileCityMuniTotal = fileCounts.cities + fileCounts.municipalities;
  
  if (dbCityMuniTotal < fileCityMuniTotal) {
    const skipped = fileCityMuniTotal - dbCityMuniTotal;
    console.log(`\n  ⚠️  ${skipped} city/municipality items are being skipped during import`);
    console.log(`     File has: ${fileCityMuniTotal}, Database has: ${dbCityMuniTotal}`);
  }
  
  // Check barangays
  const brgyDiff = fileCounts.barangays - PSA_2025.barangays;
  if (brgyDiff !== 0) {
    console.log(`\n  ⚠️  Barangay count issue:`);
    console.log(`     File has: ${fileCounts.barangays}, PSA expects: ${PSA_2025.barangays}, diff: ${brgyDiff}`);
  }
  
  const dbBrgyDiff = dbCounts.barangays - PSA_2025.barangays;
  if (dbBrgyDiff !== 0) {
    console.log(`\n  ⚠️  Barangay import issue:`);
    console.log(`     Database has: ${dbCounts.barangays}, PSA expects: ${PSA_2025.barangays}, diff: ${dbBrgyDiff}`);
    console.log(`     File has: ${fileCounts.barangays}, so ${fileCounts.barangays - dbCounts.barangays} barangays are being skipped`);
  }
  
  // Recommendations
  console.log('\n\n💡 Recommendations:');
  
  if (fileCounts.cities + fileCounts.municipalities < PSA_2025.cities + PSA_2025.municipalities) {
    console.log(`  1. Data file is missing ${(PSA_2025.cities + PSA_2025.municipalities) - (fileCounts.cities + fileCounts.municipalities)} city/municipality records`);
    console.log(`     → Download latest PSGC data from PSA website`);
  }
  
  if (fileCounts.cities !== PSA_2025.cities || fileCounts.municipalities !== PSA_2025.municipalities) {
    console.log(`  2. Review city/municipality classification logic`);
    console.log(`     → Check if some cities are being classified as municipalities or vice versa`);
  }
  
  if (dbCityMuniTotal < fileCityMuniTotal) {
    console.log(`  3. Fix import logic to ensure all city/municipality items are imported`);
    console.log(`     → Check for missing parent references (provinces, regions)`);
  }
  
  if (dbCounts.barangays < fileCounts.barangays) {
    console.log(`  4. Fix barangay import to ensure all ${fileCounts.barangays} barangays are imported`);
    console.log(`     → Check for missing parent references (cities, municipalities, provinces)`);
  }
  
  console.log('\n' + '='.repeat(60));
  process.exit(0);
}

if (require.main === module) {
  diagnose().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

module.exports = { diagnose };

