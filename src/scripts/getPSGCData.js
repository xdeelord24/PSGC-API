/**
 * Get PSGC Data - Standalone script that fetches PSGC data without database dependency
 * This script downloads PSGC data and saves it to a JSON file that can be imported later
 * 
 * Usage:
 *   node src/scripts/getPSGCData.js [--output data/psgc-data.json]
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Alternative sources for PSGC data
const DATA_URLS = [
  // Try multiple sources
  'https://raw.githubusercontent.com/Eerkz/PSGC-scraper/main/output/psgc.json',
  'https://raw.githubusercontent.com/jeffreybernadas/psgc-api/main/data/psgc.json',
  // You can add more URLs here
];

/**
 * Fetch JSON from URL
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`Trying: ${url}...`);
    
    const req = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return fetchJSON(response.headers.location)
          .then(resolve)
          .catch(reject);
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
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Try fetching from multiple sources
 */
async function fetchPSGCData() {
  const errors = [];
  
  for (const url of DATA_URLS) {
    try {
      console.log(`Fetching from ${url}...`);
      const data = await fetchJSON(url);
      console.log(`✅ Successfully fetched data from ${url}`);
      return data;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      errors.push({ url, error: error.message });
      continue;
    }
  }
  
  throw new Error(`All sources failed:\n${errors.map(e => `  - ${e.url}: ${e.error}`).join('\n')}`);
}

/**
 * Create sample data structure if fetching fails
 */
function createSamplePSGCStructure() {
  console.log('\n⚠️  Could not fetch from online sources.');
  console.log('Creating sample data structure for manual import...');
  console.log('\nTo import real data:');
  console.log('1. Download PSGC data from: https://psa.gov.ph/classification/psgc/');
  console.log('2. Convert Excel to JSON format');
  console.log('3. Use: npm run import <path-to-json-file>');
  console.log('\nOR manually structure your JSON like this:\n');
  
  const sample = [
    {
      code: '130000000',
      name: 'National Capital Region',
      type: 'Region',
      island_group_code: '1',
      island_group_name: 'Luzon'
    },
    {
      code: '137400000',
      name: 'Metro Manila',
      type: 'Province',
      region_code: '130000000'
    },
    {
      code: '137401000',
      name: 'Manila',
      type: 'City',
      province_code: '137400000',
      region_code: '130000000'
    }
  ];
  
  return sample;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const output = outputIndex !== -1 ? args[outputIndex + 1] : path.join(__dirname, '../../data/psgc-data.json');
  
  // Ensure data directory exists
  const outputDir = path.dirname(output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    console.log('Fetching PSGC data from online sources...\n');
    const data = await fetchPSGCData();
    
    // Save to file
    fs.writeFileSync(output, JSON.stringify(data, null, 2));
    console.log(`\n✅ Data saved to: ${output}`);
    console.log(`\nYou can now import it using:`);
    console.log(`  npm run import ${output}`);
    console.log(`\nOr if npm install is complete:`);
    console.log(`  node src/scripts/importPSGC.js ${output}`);
    
    return output;
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    // Create sample structure
    const sample = createSamplePSGCStructure();
    fs.writeFileSync(output, JSON.stringify(sample, null, 2));
    console.log(`\nSample structure saved to: ${output}`);
    console.log('Please replace with real PSGC data from PSA website.');
    
    return output;
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { fetchPSGCData, createSamplePSGCStructure };

