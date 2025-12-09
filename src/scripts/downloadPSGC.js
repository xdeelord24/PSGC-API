/**
 * PSGC Data Download Script
 * 
 * This script downloads PSGC data from various sources and prepares it for import.
 * 
 * Usage:
 *   node src/scripts/downloadPSGC.js [--source github|local] [--url <url>] [--output <file>]
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Known PSGC data sources
const DATA_SOURCES = {
  // GitHub repositories with PSGC data
  github: {
    // This is a placeholder - you may need to find an actual GitHub repo with PSGC JSON data
    psgcJson: 'https://raw.githubusercontent.com/yourusername/psgc-data/main/psgc.json',
    // Alternative: CSV format
    psgcCsv: 'https://raw.githubusercontent.com/yourusername/psgc-data/main/psgc.csv'
  },
  // Direct PSA links (may require manual download due to Cloudflare)
  psa: {
    latest: 'https://psa.gov.ph/classification/psgc/'
  }
};

/**
 * Download a file from URL
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`Downloading from ${url}...`);
    
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        return downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded to ${outputPath}`);
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

/**
 * Convert PSA Excel/CSV format to our JSON format
 */
function convertPSGCFormat(data, format = 'csv') {
  console.log(`Converting ${format.toUpperCase()} data to JSON format...`);
  
  const result = {
    regions: [],
    provinces: [],
    cities: [],
    municipalities: [],
    barangays: []
  };
  
  let records = [];
  
  if (format === 'csv') {
    // Simple CSV parser
    const lines = data.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    records = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || null;
      });
      return obj;
    });
  } else if (format === 'json') {
    // Assume it's already JSON
    records = typeof data === 'string' ? JSON.parse(data) : data;
  }
  
  records.forEach(record => {
    // Normalize field names (handle various possible column names)
    const code = record.code || record.Code || record.CODE || record.PSGC || record.psgc;
    const name = record.name || record.Name || record.NAME || record['Name'] || record['Geographic Area'];
    const regionCode = record.region_code || record.Region || record.regionCode || record['Region Code'];
    const provinceCode = record.province_code || record.Province || record.provinceCode || record['Province Code'];
    const cityCode = record.city_code || record.City || record.cityCode || record['City Code'];
    const municipalityCode = record.municipality_code || record.Municipality || record.municipalityCode || record['Municipality Code'];
    const level = record.level || record.Level || record.LEVEL || record.type || record.Type || record.TYPE || record['Geographic Level'];
    
    if (!code || !name) {
      return; // Skip invalid records
    }
    
    // Normalize code to 9 digits
    const normalizedCode = String(code).padStart(9, '0').substring(0, 9);
    
    // Determine entity type and create record
    if (level === 'Region' || normalizedCode.match(/^\d{2}0000000$/)) {
      result.regions.push({
        code: normalizedCode,
        name: name.trim(),
        island_group_code: record.island_group_code || record['Island Group'] || null,
        island_group_name: record.island_group_name || record['Island Group Name'] || null
      });
    } else if (level === 'Province' || normalizedCode.match(/^\d{4}00000$/)) {
      if (!regionCode) {
        // Extract region code from PSGC code (first 2 digits)
        const extractedRegion = normalizedCode.substring(0, 2) + '0000000';
        result.provinces.push({
          code: normalizedCode,
          name: name.trim(),
          region_code: extractedRegion,
          island_group_code: record.island_group_code || null
        });
      } else {
        result.provinces.push({
          code: normalizedCode,
          name: name.trim(),
          region_code: String(regionCode).padStart(9, '0').substring(0, 9),
          island_group_code: record.island_group_code || null
        });
      }
    } else if (level === 'City' || (cityCode && !municipalityCode)) {
      const region = regionCode ? String(regionCode).padStart(9, '0').substring(0, 9) : 
                    normalizedCode.substring(0, 2) + '0000000';
      const province = provinceCode ? String(provinceCode).padStart(9, '0').substring(0, 9) :
                       normalizedCode.substring(0, 4) + '00000';
      
      result.cities.push({
        code: normalizedCode,
        name: name.trim(),
        province_code: province || null,
        region_code: region,
        city_class: record.city_class || record['City Class'] || record['Classification'] || null,
        income_class: record.income_class || record['Income Class'] || null,
        is_capital: record.is_capital || record['Is Capital'] || record['Capital'] === 'Yes' ? 1 : 0
      });
    } else if (level === 'Municipality' || municipalityCode || (!cityCode && !normalizedCode.match(/000000$/))) {
      const region = regionCode ? String(regionCode).padStart(9, '0').substring(0, 9) :
                    normalizedCode.substring(0, 2) + '0000000';
      const province = provinceCode ? String(provinceCode).padStart(9, '0').substring(0, 9) :
                       normalizedCode.substring(0, 4) + '00000';
      
      result.municipalities.push({
        code: normalizedCode,
        name: name.trim(),
        province_code: province,
        region_code: region,
        income_class: record.income_class || record['Income Class'] || null,
        is_capital: record.is_capital || record['Is Capital'] || record['Capital'] === 'Yes' ? 1 : 0
      });
    } else if (level === 'Barangay' || !normalizedCode.match(/000000$/)) {
      const region = regionCode ? String(regionCode).padStart(9, '0').substring(0, 9) :
                    normalizedCode.substring(0, 2) + '0000000';
      const province = provinceCode ? String(provinceCode).padStart(9, '0').substring(0, 9) :
                       normalizedCode.substring(0, 4) + '00000';
      const city = cityCode ? String(cityCode).padStart(9, '0').substring(0, 9) : null;
      const municipality = municipalityCode ? String(municipalityCode).padStart(9, '0').substring(0, 9) : null;
      
      result.barangays.push({
        code: normalizedCode,
        name: name.trim(),
        city_code: city,
        municipality_code: municipality,
        province_code: province,
        region_code: region,
        urban_rural: record.urban_rural || record['Urban/Rural'] || record['Classification'] || null
      });
    }
  });
  
  console.log(`Converted data:`);
  console.log(`- Regions: ${result.regions.length}`);
  console.log(`- Provinces: ${result.provinces.length}`);
  console.log(`- Cities: ${result.cities.length}`);
  console.log(`- Municipalities: ${result.municipalities.length}`);
  console.log(`- Barangays: ${result.barangays.length}`);
  
  return result;
}

/**
 * Main function
 */
async function downloadPSGC(options = {}) {
  const source = options.source || 'local';
  const url = options.url;
  const output = options.output || path.join(__dirname, '../../data/psgc-data.json');
  
  // Ensure data directory exists
  const outputDir = path.dirname(output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  if (source === 'local' && !url) {
    console.log('Please provide a local file path or use --url option');
    console.log('Example: node src/scripts/downloadPSGC.js --source local --url ./psgc-data.csv');
    return;
  }
  
  try {
    let data;
    let format = 'json';
    
    if (url) {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Download from URL
        const tempFile = path.join(outputDir, 'temp-download');
        await downloadFile(url, tempFile);
        
        if (url.endsWith('.csv')) {
          format = 'csv';
          data = fs.readFileSync(tempFile, 'utf-8');
        } else {
          data = fs.readFileSync(tempFile, 'utf-8');
        }
        
        fs.unlinkSync(tempFile); // Clean up temp file
      } else {
        // Local file
        if (!fs.existsSync(url)) {
          throw new Error(`File not found: ${url}`);
        }
        
        if (url.endsWith('.csv')) {
          format = 'csv';
        }
        
        data = fs.readFileSync(url, 'utf-8');
      }
    }
    
    // Convert to our format
    const converted = convertPSGCFormat(data, format);
    
    // Flatten all entities into single array for import
    const allData = [
      ...converted.regions,
      ...converted.provinces,
      ...converted.cities,
      ...converted.municipalities,
      ...converted.barangays
    ];
    
    // Save to output file
    fs.writeFileSync(output, JSON.stringify(allData, null, 2));
    console.log(`\nConverted data saved to ${output}`);
    console.log(`You can now import it using: npm run import ${output}`);
    
    return output;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source') {
      options.source = args[++i];
    } else if (args[i] === '--url') {
      options.url = args[++i];
    } else if (args[i] === '--output') {
      options.output = args[++i];
    }
  }
  
  downloadPSGC(options)
    .then(() => {
      console.log('\nDownload and conversion completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nError:', error);
      process.exit(1);
    });
}

module.exports = { downloadPSGC, convertPSGCFormat };

