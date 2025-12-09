/**
 * Alternative method to fetch barangays when PSGC Cloud API has rate limits
 * This script provides multiple fallback strategies
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PSGC_CLOUD_BASE = 'https://psgc.cloud/api';

function fetchJSON(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const attemptFetch = (attempt) => {
      https.get(url, (response) => {
        if (response.statusCode === 429 && attempt < retries) {
          // Rate limited, wait and retry
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`  ⏸️  Rate limited, waiting ${waitTime/1000}s before retry ${attempt + 1}/${retries}...`);
          setTimeout(() => attemptFetch(attempt + 1), waitTime);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      }).on('error', reject);
    };
    
    attemptFetch(1);
  });
}

async function fetchBarangaysInBatches(provinces, batchSize = 5, delayBetweenBatches = 5000) {
  const allBarangays = [];
  const failed = [];
  
  console.log(`\n📥 Fetching barangays in batches of ${batchSize}...`);
  console.log(`   Delay between batches: ${delayBetweenBatches/1000}s`);
  
  for (let i = 0; i < provinces.length; i += batchSize) {
    const batch = provinces.slice(i, Math.min(i + batchSize, provinces.length));
    console.log(`\n  Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(provinces.length/batchSize)} (Provinces ${i + 1}-${Math.min(i + batchSize, provinces.length)})`);
    
    const batchPromises = batch.map(async (province, idx) => {
      const provIndex = i + idx + 1;
      const provCode = String(province.code || province.Code || '').padStart(9, '0').substring(0, 9);
      const provName = province.name || province.Name || `Province ${provIndex}`;
      
      // Try multiple endpoint formats
      const endpoints = [
        `${PSGC_CLOUD_BASE}/provinces/${provCode.substring(0, 4)}/barangays`,
        `${PSGC_CLOUD_BASE}/provinces/${provCode}/barangays`,
        `${PSGC_CLOUD_BASE}/provinces/${parseInt(provCode.substring(0, 4))}/barangays`,
      ];
      
      for (const endpoint of endpoints) {
        try {
          const barangays = await fetchJSON(endpoint, 2);
          if (Array.isArray(barangays) && barangays.length > 0) {
            console.log(`    ✓ ${provName}: ${barangays.length} barangays`);
            return { success: true, barangays, province: provName };
          }
        } catch (error) {
          if (error.message.includes('429')) {
            throw error; // Let retry logic handle it
          }
          continue; // Try next endpoint
        }
      }
      
      console.log(`    ⚠️  ${provName}: No barangays found`);
      return { success: false, barangays: [], province: provName };
    });
    
    try {
      const results = await Promise.allSettled(batchPromises);
      
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.success) {
          allBarangays.push(...result.value.barangays);
        } else {
          const provIndex = i + idx + 1;
          failed.push(provinces[i + idx]);
        }
      });
      
      console.log(`    📊 Batch total: ${allBarangays.length} barangays so far`);
      
    } catch (error) {
      console.log(`    ❌ Batch failed: ${error.message}`);
      failed.push(...batch);
    }
    
    // Wait between batches to avoid rate limits
    if (i + batchSize < provinces.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return { allBarangays, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const inputFile = args[0] || 'data/psgc-data-complete.json';
  const outputFile = args[1] || 'data/psgc-data-with-barangays.json';
  
  console.log('🇵🇭 PSGC Barangays Fetch - Alternative Method');
  console.log('='.repeat(60));
  
  // Load existing data
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    console.log('\n💡 Run this first: npm run download-psa');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const provinces = data.filter(item => {
    const code = String(item.code || '').padStart(9, '0');
    return code.match(/^\d{4}00000$/);
  });
  
  console.log(`\n📊 Found ${provinces.length} provinces in ${inputFile}`);
  
  // Check if barangays already exist
  const existingBarangays = data.filter(item => {
    const code = String(item.code || '').padStart(9, '0');
    return code.match(/^\d{9}$/) && !code.match(/000$/);
  });
  
  if (existingBarangays.length > 0) {
    console.log(`  ⚠️  Already have ${existingBarangays.length} barangays`);
    console.log(`  💡 Delete existing barangays first if you want to re-fetch`);
  }
  
  // Fetch barangays
  console.log(`\n🔄 Starting barangay fetch...`);
  const { allBarangays, failed } = await fetchBarangaysInBatches(provinces, 3, 10000);
  
  console.log(`\n✅ Fetch completed:`);
  console.log(`   Barangays fetched: ${allBarangays.length}`);
  console.log(`   Failed provinces: ${failed.length}`);
  
  if (allBarangays.length === 0) {
    console.log(`\n⚠️  No barangays were fetched. The API may be unavailable or rate-limited.`);
    console.log(`\n💡 Alternative options:`);
    console.log(`   1. Wait 30 minutes and try again`);
    console.log(`   2. Manually download from PSA website: https://psa.gov.ph/classification/psgc/`);
    console.log(`   3. Use a different data source`);
    process.exit(1);
  }
  
  // Normalize barangay codes
  function normalizeCode(code) {
    const codeStr = String(code);
    if (codeStr.length === 10 && codeStr.startsWith('0')) {
      return codeStr.substring(1);
    }
    return codeStr.padStart(9, '0').substring(0, 9);
  }
  
  // Convert to our format
  const barangays = allBarangays.map(item => {
    const code = normalizeCode(item.code || item.Code);
    const name = item.name || item.Name || '';
    
    return {
      code,
      name,
      city_code: item.city_code ? normalizeCode(item.city_code) : null,
      municipality_code: item.municipality_code ? normalizeCode(item.municipality_code) : null,
      province_code: item.province_code ? normalizeCode(item.province_code) : code.substring(0, 4) + '00000',
      region_code: item.region_code ? normalizeCode(item.region_code) : code.substring(0, 2) + '0000000',
      urban_rural: item.urban_rural || item.urbanRural || null
    };
  });
  
  // Combine with existing data (remove old barangays if any)
  const otherData = data.filter(item => {
    const code = String(item.code || '').padStart(9, '0');
    return !(code.match(/^\d{9}$/) && !code.match(/000$/));
  });
  
  const finalData = [...otherData, ...barangays];
  
  // Save
  fs.writeFileSync(outputFile, JSON.stringify(finalData, null, 2));
  console.log(`\n💾 Saved to: ${outputFile}`);
  console.log(`   Total records: ${finalData.length}`);
  console.log(`   Barangays: ${barangays.length}`);
  console.log(`\n📦 Next step: npm run import ${outputFile}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { fetchBarangaysInBatches };

