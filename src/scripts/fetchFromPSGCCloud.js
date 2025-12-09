/**
 * Fetch PSGC Data from PSGC Cloud API
 * This script fetches all PSGC data from psgc.cloud API and converts it to our format
 * 
 * Usage:
 *   node src/scripts/fetchFromPSGCCloud.js [--output data/psgc-data.json]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PSGC_CLOUD_BASE = 'https://psgc.cloud/api';

/**
 * Fetch JSON from URL
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching ${url}...`);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`  ✅ Fetched ${Array.isArray(json) ? json.length : 'data'} items`);
          resolve(json);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Normalize PSGC code (handle 10-digit codes from PSGC Cloud)
 */
function normalizeCode(code) {
  const codeStr = String(code);
  // PSGC Cloud uses 10 digits, we use 9 - remove leading zero if present
  if (codeStr.length === 10 && codeStr.startsWith('0')) {
    return codeStr.substring(1);
  }
  return codeStr.padStart(9, '0').substring(0, 9);
}

/**
 * Convert PSGC Cloud format to our database format
 */
function convertToOurFormat(items, type) {
  return items.map(item => {
    const code = normalizeCode(item.code || item.Code);
    const name = item.name || item.Name || item['Geographic Area'];
    
    if (!code || !name) return null;
    
    const base = { code, name };
    
    switch (type) {
      case 'region':
        return {
          ...base,
          island_group_code: item.island_group_code || item['Island Group'] || null,
          island_group_name: item.island_group_name || item['Island Group Name'] || null
        };
        
      case 'province':
        return {
          ...base,
          region_code: item.region_code ? normalizeCode(item.region_code) : 
                      (item.region ? normalizeCode(item.region) : code.substring(0, 2) + '0000000'),
          island_group_code: item.island_group_code || null
        };
        
      case 'city':
        return {
          ...base,
          province_code: item.province_code ? normalizeCode(item.province_code) :
                        (item.province ? normalizeCode(item.province) : null),
          region_code: item.region_code ? normalizeCode(item.region_code) :
                      (item.region ? normalizeCode(item.region) : code.substring(0, 2) + '0000000'),
          city_class: item.city_class || item['City Class'] || item.classification || null,
          income_class: item.income_class || item['Income Class'] || null,
          is_capital: item.is_capital || item['Is Capital'] || (item.capital === 'Yes' ? 1 : 0) || 0
        };
        
      case 'municipality':
        return {
          ...base,
          province_code: item.province_code ? normalizeCode(item.province_code) :
                        (item.province ? normalizeCode(item.province) : code.substring(0, 4) + '00000'),
          region_code: item.region_code ? normalizeCode(item.region_code) :
                      (item.region ? normalizeCode(item.region) : code.substring(0, 2) + '0000000'),
          income_class: item.income_class || item['Income Class'] || null,
          is_capital: item.is_capital || item['Is Capital'] || (item.capital === 'Yes' ? 1 : 0) || 0
        };
        
      case 'barangay':
        return {
          ...base,
          city_code: item.city_code ? normalizeCode(item.city_code) :
                    (item.city ? normalizeCode(item.city) : null),
          municipality_code: item.municipality_code ? normalizeCode(item.municipality_code) :
                            (item.municipality ? normalizeCode(item.municipality) : null),
          province_code: item.province_code ? normalizeCode(item.province_code) :
                        (item.province ? normalizeCode(item.province) : code.substring(0, 4) + '00000'),
          region_code: item.region_code ? normalizeCode(item.region_code) :
                      (item.region ? normalizeCode(item.region) : code.substring(0, 2) + '0000000'),
          urban_rural: item.urban_rural || item['Urban/Rural'] || item.classification || null
        };
        
      default:
        return base;
    }
  }).filter(item => item !== null);
}

/**
 * Main function
 */
async function fetchAllPSGCData() {
  console.log('Fetching PSGC data from PSGC Cloud API...\n');
  
  try {
    // Fetch all entities (handle errors individually)
    console.log('Fetching regions, provinces, cities, and municipalities...');
    const results = await Promise.allSettled([
      fetchJSON(`${PSGC_CLOUD_BASE}/regions`),
      fetchJSON(`${PSGC_CLOUD_BASE}/provinces`),
      fetchJSON(`${PSGC_CLOUD_BASE}/cities`),
      fetchJSON(`${PSGC_CLOUD_BASE}/municipalities`),
      fetchJSON(`${PSGC_CLOUD_BASE}/barangays`).catch((error) => {
        console.log(`  ⚠️  Direct barangays endpoint failed (${error.message}), will try by province...`);
        return null;
      })
    ]);
    
    const regionsRaw = results[0].status === 'fulfilled' ? results[0].value : [];
    const provincesRaw = results[1].status === 'fulfilled' ? results[1].value : [];
    const citiesRaw = results[2].status === 'fulfilled' ? results[2].value : [];
    const municipalitiesRaw = results[3].status === 'fulfilled' ? results[3].value : [];
    let barangaysRaw = results[4].status === 'fulfilled' ? results[4].value : null;
    
    // Try to fetch barangays by province if direct fetch failed
    if (!barangaysRaw && provincesRaw.length > 0) {
      console.log(`\nFetching barangays by province (${provincesRaw.length} provinces, this may take a while)...`);
      barangaysRaw = [];
      
      // Fetch ALL provinces
      for (let i = 0; i < provincesRaw.length; i++) {
        try {
          const provCode = normalizeCode(provincesRaw[i].code);
          const provName = provincesRaw[i].name || provincesRaw[i].Name || `Province ${i + 1}`;
          const barangays = await fetchJSON(`${PSGC_CLOUD_BASE}/provinces/${provCode}/barangays`);
          if (Array.isArray(barangays)) {
            barangaysRaw.push(...barangays);
            console.log(`  ✓ ${provName}: ${barangays.length} barangays (total: ${barangaysRaw.length})`);
          }
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.log(`  ⚠️  Failed to fetch barangays for province ${i + 1}: ${error.message}`);
        }
      }
      
      if (barangaysRaw.length > 0) {
        console.log(`\n  ✅ Fetched ${barangaysRaw.length} barangays total`);
      } else {
        console.log(`  ⚠️  No barangays fetched`);
      }
    }
    
    console.log('\nConverting to our format...');
    
    // Convert to our format
    const regions = convertToOurFormat(regionsRaw, 'region');
    const provinces = convertToOurFormat(provincesRaw, 'province');
    const cities = convertToOurFormat(citiesRaw, 'city');
    const municipalities = convertToOurFormat(municipalitiesRaw, 'municipality');
    const barangays = convertToOurFormat(barangaysRaw, 'barangay');
    
    // Combine all data
    const allData = [
      ...regions,
      ...provinces,
      ...cities,
      ...municipalities,
      ...barangays
    ];
    
    console.log('\n✅ Data conversion completed:');
    console.log(`- Regions: ${regions.length}`);
    console.log(`- Provinces: ${provinces.length}`);
    console.log(`- Cities: ${cities.length}`);
    console.log(`- Municipalities: ${municipalities.length}`);
    console.log(`- Barangays: ${barangays.length}`);
    console.log(`Total: ${allData.length} records`);
    
    return allData;
  } catch (error) {
    console.error(`\n❌ Error fetching data: ${error.message}`);
    throw error;
  }
}

/**
 * Save data to file
 */
function saveData(data, outputPath) {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\n✅ Data saved to: ${outputPath}`);
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const output = outputIndex !== -1 ? args[outputIndex + 1] : 
                 path.join(__dirname, '../../data/psgc-data.json');
  
  try {
    const data = await fetchAllPSGCData();
    saveData(data, output);
    
    console.log(`\n📦 Next steps:`);
    console.log(`1. Install dependencies: npm install`);
    console.log(`   (Note: You may need Visual Studio Build Tools for better-sqlite3 on Windows)`);
    console.log(`2. Import the data:`);
    console.log(`   npm run import ${output}`);
    console.log(`\nOr manually:`);
    console.log(`   node src/scripts/importPSGC.js ${output}`);
    
  } catch (error) {
    console.error(`\n❌ Failed to fetch PSGC data: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchAllPSGCData, convertToOurFormat };

