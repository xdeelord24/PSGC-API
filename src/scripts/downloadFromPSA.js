/**
 * Download PSGC Data from PSA (Philippine Statistics Authority)
 * 
 * This script attempts to download PSGC data from official PSA sources.
 * Since PSA website may require manual interaction, this script provides
 * multiple approaches and fallback options.
 * 
 * Usage:
 *   node src/scripts/downloadFromPSA.js [--output data/psgc-data.json]
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PSA_BASE_URL = 'https://psa.gov.ph';
const PSGC_CLOUD_BASE = 'https://psgc.cloud/api'; // Alternative: PSGC Cloud API (sources from PSA)
const PSA_API_BASE = 'https://psa.gov.ph/psgc-api/v1'; // Official PSA API (if available)

/**
 * Fetch JSON from URL with better error handling
 */
function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`📥 Fetching ${url}...`);
    
    const requestOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        ...options.headers
      },
      timeout: options.timeout || 30000
    };
    
    const req = protocol.get(url, requestOptions, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          const fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, url).href;
          return fetchJSON(fullRedirectUrl, options).then(resolve).catch(reject);
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          const count = Array.isArray(json) ? json.length : (json.data && Array.isArray(json.data) ? json.data.length : 'data');
          console.log(`  ✅ Fetched ${count} items`);
          resolve(json);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Normalize PSGC code
 */
function normalizeCode(code) {
  if (!code) return null;
  const codeStr = String(code);
  // Handle 10-digit codes (remove leading zero)
  if (codeStr.length === 10 && codeStr.startsWith('0')) {
    return codeStr.substring(1);
  }
  return codeStr.padStart(9, '0').substring(0, 9);
}

/**
 * Convert to our format
 */
function convertToOurFormat(items, type) {
  if (!Array.isArray(items)) {
    items = items.data || [items];
  }
  
  return items.map(item => {
    const code = normalizeCode(item.code || item.Code || item.PSGC || item.psgc);
    const name = item.name || item.Name || item['Geographic Area'] || item.geographicArea || '';
    
    if (!code || !name) return null;
    
    const base = { code, name };
    
    switch (type) {
      case 'region':
        return {
          ...base,
          island_group_code: item.island_group_code || item.islandGroupCode || null,
          island_group_name: item.island_group_name || item.islandGroupName || null
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
                        (item.province ? normalizeCode(item.province) : code.substring(0, 4) + '00000'),
          region_code: item.region_code ? normalizeCode(item.region_code) :
                      (item.region ? normalizeCode(item.region) : code.substring(0, 2) + '0000000'),
          city_class: item.city_class || item.cityClass || item.classification || null,
          income_class: item.income_class || item.incomeClass || null,
          is_capital: item.is_capital || item.isCapital || (item.capital === 'Yes' ? 1 : 0) || 0
        };
        
      case 'municipality':
        return {
          ...base,
          province_code: item.province_code ? normalizeCode(item.province_code) :
                        (item.province ? normalizeCode(item.province) : code.substring(0, 4) + '00000'),
          region_code: item.region_code ? normalizeCode(item.region_code) :
                      (item.region ? normalizeCode(item.region) : code.substring(0, 2) + '0000000'),
          income_class: item.income_class || item.incomeClass || null,
          is_capital: item.is_capital || item.isCapital || (item.capital === 'Yes' ? 1 : 0) || 0
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
          urban_rural: item.urban_rural || item.urbanRural || item.classification || null
        };
        
      default:
        return base;
    }
  }).filter(item => item !== null);
}

/**
 * Fetch from PSGC Cloud API (Recommended - sources from PSA)
 */
async function fetchFromPSGCCloud() {
  console.log('\n🌐 Fetching from PSGC Cloud API (sources from PSA)...\n');
  
  try {
    // Fetch regions, provinces, cities, municipalities
    console.log('Fetching regions, provinces, cities, and municipalities...');
    const [regionsRaw, provincesRaw, citiesRaw, municipalitiesRaw] = await Promise.all([
      fetchJSON(`${PSGC_CLOUD_BASE}/regions`).catch(err => { console.log(`  ⚠️  Regions: ${err.message}`); return []; }),
      fetchJSON(`${PSGC_CLOUD_BASE}/provinces`).catch(err => { console.log(`  ⚠️  Provinces: ${err.message}`); return []; }),
      fetchJSON(`${PSGC_CLOUD_BASE}/cities`).catch(err => { console.log(`  ⚠️  Cities: ${err.message}`); return []; }),
      fetchJSON(`${PSGC_CLOUD_BASE}/municipalities`).catch(err => { console.log(`  ⚠️  Municipalities: ${err.message}`); return []; })
    ]);
    
    // Try to fetch all barangays directly
    let barangaysRaw = [];
    try {
      console.log('\nFetching all barangays...');
      barangaysRaw = await fetchJSON(`${PSGC_CLOUD_BASE}/barangays`);
    } catch (error) {
      console.log(`  ⚠️  Direct barangays endpoint failed: ${error.message}`);
      console.log(`  📥 Fetching barangays by province (this will take several minutes)...`);
      
      // Fetch barangays by province
      // Try different code formats - PSGC Cloud might use shorter codes
      for (let i = 0; i < provincesRaw.length; i++) {
        try {
          const provCode = normalizeCode(provincesRaw[i].code);
          const provName = provincesRaw[i].name || provincesRaw[i].Name || `Province ${i + 1}`;
          
          // Try different code formats
          let barangays = null;
          const codeFormats = [
            provCode, // Full 9-digit
            provCode.substring(0, 4), // First 4 digits (province code)
            provCode.substring(0, 6), // First 6 digits
            String(parseInt(provCode.substring(0, 4))), // Numeric province code
          ];
          
          for (const codeFormat of codeFormats) {
            try {
              barangays = await fetchJSON(`${PSGC_CLOUD_BASE}/provinces/${codeFormat}/barangays`, { timeout: 10000 });
              if (Array.isArray(barangays) && barangays.length > 0) {
                break; // Success, use this format
              }
            } catch (err) {
              // Try next format
              continue;
            }
          }
          
          if (Array.isArray(barangays) && barangays.length > 0) {
            barangaysRaw.push(...barangays);
            if ((i + 1) % 5 === 0 || i === provincesRaw.length - 1) {
              console.log(`  ✓ Progress: ${i + 1}/${provincesRaw.length} provinces (${barangaysRaw.length} barangays total)`);
            }
          } else {
            console.log(`  ⚠️  No barangays found for ${provName} (code: ${provCode})`);
          }
          
          // Longer delay to avoid rate limiting (429 errors)
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          if (error.message.includes('429')) {
            console.log(`  ⏸️  Rate limited at province ${i + 1}, waiting 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            i--; // Retry this province
          } else {
            console.log(`  ⚠️  Failed province ${i + 1}: ${error.message}`);
          }
        }
      }
    }
    
    // Convert to our format
    console.log('\n🔄 Converting to our format...');
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
    
    console.log('\n✅ Data fetched successfully:');
    console.log(`  📊 Regions: ${regions.length}`);
    console.log(`  📊 Provinces: ${provinces.length}`);
    console.log(`  📊 Cities: ${cities.length}`);
    console.log(`  📊 Municipalities: ${municipalities.length}`);
    console.log(`  📊 Barangays: ${barangays.length}`);
    console.log(`  📊 Total: ${allData.length} records`);
    
    return allData;
  } catch (error) {
    console.error(`\n❌ Error fetching from PSGC Cloud API: ${error.message}`);
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
  console.log(`\n💾 Data saved to: ${outputPath}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Print manual download instructions
 */
function printManualInstructions() {
  console.log('\n' + '='.repeat(70));
  console.log('📥 MANUAL DOWNLOAD INSTRUCTIONS FROM PSA WEBSITE');
  console.log('='.repeat(70));
  console.log('\n1. Visit: https://psa.gov.ph/classification/psgc/');
  console.log('2. Navigate to "Download PSGC Publications" section');
  console.log('3. Download the latest PSGC publication (Excel file)');
  console.log('   - Look for "Philippine Standard Geographic Code as of 30 September 2025"');
  console.log('\n4. Convert Excel to JSON format');
  console.log('   - You can use online tools or Excel to CSV converters');
  console.log('   - Or use: npm run download -- --source local --url <path-to-excel-or-csv>');
  console.log('\n5. Import the converted data:');
  console.log('   npm run import <path-to-converted-json>');
  console.log('\n' + '='.repeat(70) + '\n');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const output = outputIndex !== -1 ? args[outputIndex + 1] : 
                 path.join(__dirname, '../../data/psgc-data-complete.json');
  
  console.log('🇵🇭 PSGC Data Download from PSA Sources');
  console.log('='.repeat(70));
  console.log(`\n📁 Output file: ${output}\n`);
  
  try {
    // Try to fetch from PSGC Cloud API (recommended)
    const data = await fetchFromPSGCCloud();
    saveData(data, output);
    
    console.log(`\n✅ Download completed successfully!`);
    
    if (data.filter(item => {
      const code = String(item.code || '').padStart(9, '0');
      return code.match(/^\d{9}$/) && !code.match(/000$/);
    }).length === 0) {
      console.log(`\n⚠️  WARNING: No barangays were fetched (0 barangays)`);
      console.log(`   The PSGC Cloud API may be rate-limited or unavailable.`);
      console.log(`\n💡 To fetch barangays, try:`);
      console.log(`   1. Wait 30 minutes and run: npm run fetch-barangays ${output}`);
      console.log(`   2. Or manually download from PSA: https://psa.gov.ph/classification/psgc/`);
    }
    
    console.log(`\n📦 Next steps:`);
    console.log(`1. Validate the data:`);
    console.log(`   npm run validate ${output}`);
    console.log(`\n2. Import into database:`);
    console.log(`   npm run import ${output}`);
    console.log(`\n3. Verify the import:`);
    console.log(`   npm run validate ${output}`);
    
  } catch (error) {
    console.error(`\n❌ Automated download failed: ${error.message}`);
    printManualInstructions();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchFromPSGCCloud, convertToOurFormat, saveData };

