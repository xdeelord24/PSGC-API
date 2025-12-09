/**
 * Fetch PSGC Data from Online Sources
 * 
 * This script fetches PSGC data from GitHub repositories or other sources
 * and imports it directly into the database.
 * 
 * Usage:
 *   node src/scripts/fetchPSGC.js [--source <source>]
 */

const https = require('https');
const http = require('http');
const db = require('../database/db');

// Known PSGC data sources
const PSGC_SOURCES = {
  // GitHub repositories with processed PSGC data
  github: {
    // Example: A known GitHub repo with PSGC JSON
    // You may need to update this with actual working repositories
    json: 'https://raw.githubusercontent.com/lnfel/lamy-psgc/main/data/psgc.json',
    csv: 'https://raw.githubusercontent.com/Eerkz/PSGC-scraper/main/output/psgc.csv'
  },
  // Alternative: Use PSGC Cloud API (if available)
  psgcCloud: {
    regions: 'https://psgc.cloud/api/regions',
    provinces: 'https://psgc.cloud/api/provinces',
    cities: 'https://psgc.cloud/api/cities',
    municipalities: 'https://psgc.cloud/api/municipalities',
    barangays: 'https://psgc.cloud/api/barangays'
  }
};

/**
 * Fetch JSON data from URL
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`Fetching JSON from ${url}...`);
    
    protocol.get(url, (response) => {
      let data = '';
      
      if (response.statusCode === 301 || response.statusCode === 302) {
        return fetchJSON(response.headers.location)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch CSV data from URL
 */
function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`Fetching CSV from ${url}...`);
    
    protocol.get(url, (response) => {
      let data = '';
      
      if (response.statusCode === 301 || response.statusCode === 302) {
        return fetchCSV(response.headers.location)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          // Simple CSV parser
          const lines = data.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const records = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || null;
            });
            return obj;
          });
          resolve(records);
        } catch (error) {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Convert PSGC data to our database format
 */
function normalizePSGCItem(item, type) {
  // Handle various field name variations
  const code = String(item.code || item.Code || item.CODE || item.PSGC || item.psgc || '').padStart(9, '0').substring(0, 9);
  const name = (item.name || item.Name || item.NAME || item['Name'] || item['Geographic Area'] || '').trim();
  
  if (!code || code === '000000000' || !name) {
    return null;
  }
  
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
        region_code: String(item.region_code || item.regionCode || item.Region || code.substring(0, 2) + '0000000').padStart(9, '0').substring(0, 9),
        island_group_code: item.island_group_code || null
      };
      
    case 'city':
      return {
        ...base,
        province_code: item.province_code || item.provinceCode || item.Province || code.substring(0, 4) + '00000' || null,
        region_code: String(item.region_code || item.regionCode || item.Region || code.substring(0, 2) + '0000000').padStart(9, '0').substring(0, 9),
        district_code: item.district_code || item.districtCode || null,
        city_class: item.city_class || item['City Class'] || item.classification || null,
        income_class: item.income_class || item['Income Class'] || null,
        is_capital: (item.is_capital || item['Is Capital'] || item.capital === 'Yes' || item.Capital === 'Yes') ? 1 : 0
      };
      
    case 'municipality':
      return {
        ...base,
        province_code: String(item.province_code || item.provinceCode || item.Province || code.substring(0, 4) + '00000').padStart(9, '0').substring(0, 9),
        region_code: String(item.region_code || item.regionCode || item.Region || code.substring(0, 2) + '0000000').padStart(9, '0').substring(0, 9),
        district_code: item.district_code || item.districtCode || null,
        income_class: item.income_class || item['Income Class'] || null,
        is_capital: (item.is_capital || item['Is Capital'] || item.capital === 'Yes' || item.Capital === 'Yes') ? 1 : 0
      };
      
    case 'barangay':
      return {
        ...base,
        city_code: item.city_code || item.cityCode || item.City || null,
        municipality_code: item.municipality_code || item.municipalityCode || item.Municipality || null,
        province_code: String(item.province_code || item.provinceCode || item.Province || code.substring(0, 4) + '00000').padStart(9, '0').substring(0, 9),
        region_code: String(item.region_code || item.regionCode || item.Region || code.substring(0, 2) + '0000000').padStart(9, '0').substring(0, 9),
        urban_rural: item.urban_rural || item['Urban/Rural'] || item.classification || null
      };
      
    default:
      return null;
  }
}

/**
 * Import regions
 */
function importRegions(regions) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO regions (code, name, island_group_code, island_group_name, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const transaction = db.transaction((items) => {
    let count = 0;
    for (const item of items) {
      const normalized = normalizePSGCItem(item, 'region');
      if (normalized) {
        stmt.run(normalized.code, normalized.name, normalized.island_group_code, normalized.island_group_name);
        count++;
      }
    }
    return count;
  });
  
  return transaction(regions);
}

/**
 * Import provinces
 */
function importProvinces(provinces) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO provinces (code, name, region_code, island_group_code, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const transaction = db.transaction((items) => {
    let count = 0;
    for (const item of items) {
      const normalized = normalizePSGCItem(item, 'province');
      if (normalized) {
        stmt.run(normalized.code, normalized.name, normalized.region_code, normalized.island_group_code);
        count++;
      }
    }
    return count;
  });
  
  return transaction(provinces);
}

/**
 * Import cities
 */
function importCities(cities) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO cities (
      code, name, province_code, district_code, region_code,
      city_class, income_class, is_capital, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const transaction = db.transaction((items) => {
    let count = 0;
    for (const item of items) {
      const normalized = normalizePSGCItem(item, 'city');
      if (normalized) {
        stmt.run(
          normalized.code, normalized.name,
          normalized.province_code, normalized.district_code, normalized.region_code,
          normalized.city_class, normalized.income_class, normalized.is_capital
        );
        count++;
      }
    }
    return count;
  });
  
  return transaction(cities);
}

/**
 * Import municipalities
 */
function importMunicipalities(municipalities) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO municipalities (
      code, name, province_code, district_code, region_code,
      income_class, is_capital, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const transaction = db.transaction((items) => {
    let count = 0;
    for (const item of items) {
      const normalized = normalizePSGCItem(item, 'municipality');
      if (normalized) {
        stmt.run(
          normalized.code, normalized.name,
          normalized.province_code, normalized.district_code, normalized.region_code,
          normalized.income_class, normalized.is_capital
        );
        count++;
      }
    }
    return count;
  });
  
  return transaction(municipalities);
}

/**
 * Import barangays
 */
function importBarangays(barangays) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO barangays (
      code, name, city_code, municipality_code,
      province_code, region_code, urban_rural, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const transaction = db.transaction((items) => {
    let count = 0;
    for (const item of items) {
      const normalized = normalizePSGCItem(item, 'barangay');
      if (normalized) {
        stmt.run(
          normalized.code, normalized.name,
          normalized.city_code, normalized.municipality_code,
          normalized.province_code, normalized.region_code, normalized.urban_rural
        );
        count++;
      }
    }
    return count;
  });
  
  return transaction(barangays);
}

/**
 * Import from flat JSON array (all entities mixed)
 */
function importFromFlatJSON(data) {
  console.log('Processing flat JSON data...');
  
  const regions = [];
  const provinces = [];
  const cities = [];
  const municipalities = [];
  const barangays = [];
  
  data.forEach(item => {
    const code = String(item.code || item.Code || item.CODE || '').padStart(9, '0').substring(0, 9);
    
    if (!code || code === '000000000') return;
    
    // Classify by code pattern
    if (code.match(/^\d{2}0000000$/)) {
      regions.push(item);
    } else if (code.match(/^\d{4}00000$/)) {
      provinces.push(item);
    } else if (code.match(/^\d{6}000$/)) {
      // Could be city or municipality - check context
      if (item.city_code || item.type === 'City') {
        cities.push(item);
      } else {
        municipalities.push(item);
      }
    } else {
      barangays.push(item);
    }
  });
  
  console.log(`Found: ${regions.length} regions, ${provinces.length} provinces, ${cities.length} cities, ${municipalities.length} municipalities, ${barangays.length} barangays`);
  
  // Import in order (regions first, then provinces, etc.)
  const regionCount = importRegions(regions);
  const provinceCount = importProvinces(provinces);
  const cityCount = importCities(cities);
  const municipalityCount = importMunicipalities(municipalities);
  const barangayCount = importBarangays(barangays);
  
  return {
    regions: regionCount,
    provinces: provinceCount,
    cities: cityCount,
    municipalities: municipalityCount,
    barangays: barangayCount
  };
}

/**
 * Fetch from PSGC Cloud API
 */
async function fetchFromPSGCCloud() {
  console.log('Fetching from PSGC Cloud API...');
  
  try {
    const [regions, provinces, cities, municipalities, barangays] = await Promise.all([
      fetchJSON(PSGC_SOURCES.psgcCloud.regions),
      fetchJSON(PSGC_SOURCES.psgcCloud.provinces),
      fetchJSON(PSGC_SOURCES.psgcCloud.cities),
      fetchJSON(PSGC_SOURCES.psgcCloud.municipalities),
      fetchJSON(PSGC_SOURCES.psgcCloud.barangays)
    ]);
    
    const regionCount = importRegions(regions.data || regions);
    const provinceCount = importProvinces(provinces.data || provinces);
    const cityCount = importCities(cities.data || cities);
    const municipalityCount = importMunicipalities(municipalities.data || municipalities);
    const barangayCount = importBarangays(barangays.data || barangays);
    
    return {
      regions: regionCount,
      provinces: provinceCount,
      cities: cityCount,
      municipalities: municipalityCount,
      barangays: barangayCount
    };
  } catch (error) {
    console.warn(`PSGC Cloud API failed: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch from GitHub JSON
 */
async function fetchFromGitHub() {
  console.log('Fetching from GitHub repository...');
  
  try {
    const data = await fetchJSON(PSGC_SOURCES.github.json);
    return importFromFlatJSON(Array.isArray(data) ? data : (data.data || Object.values(data).flat()));
  } catch (error) {
    console.warn(`GitHub JSON source failed: ${error.message}`);
    console.log('Trying CSV source...');
    
    try {
      const data = await fetchCSV(PSGC_SOURCES.github.csv);
      return importFromFlatJSON(data);
    } catch (csvError) {
      throw new Error(`Both GitHub sources failed. JSON: ${error.message}, CSV: ${csvError.message}`);
    }
  }
}

/**
 * Main function
 */
async function fetchPSGC(source = 'github') {
  console.log(`Fetching PSGC data from source: ${source}\n`);
  
  try {
    let result;
    
    switch (source.toLowerCase()) {
      case 'github':
        result = await fetchFromGitHub();
        break;
      case 'psgc-cloud':
      case 'cloud':
        result = await fetchFromPSGCCloud();
        break;
      default:
        throw new Error(`Unknown source: ${source}. Available sources: github, psgc-cloud`);
    }
    
    console.log('\n✅ Import completed successfully!');
    console.log(`- Regions: ${result.regions}`);
    console.log(`- Provinces: ${result.provinces}`);
    console.log(`- Cities: ${result.cities}`);
    console.log(`- Municipalities: ${result.municipalities}`);
    console.log(`- Barangays: ${result.barangays}`);
    console.log(`Total: ${result.regions + result.provinces + result.cities + result.municipalities + result.barangays} records`);
    
    return result;
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    throw error;
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const sourceIndex = args.indexOf('--source');
  const source = sourceIndex !== -1 ? args[sourceIndex + 1] : 'github';
  
  fetchPSGC(source)
    .then(() => {
      console.log('\n✅ PSGC data import completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to import PSGC data:', error.message);
      console.log('\nNote: You may need to manually download PSGC data from https://psa.gov.ph/classification/psgc/');
      console.log('Then use: npm run import <path-to-file>');
      process.exit(1);
    });
}

module.exports = { fetchPSGC, fetchFromGitHub, fetchFromPSGCCloud };

