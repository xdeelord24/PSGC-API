/**
 * Download PSGC Data from DILG Excel File
 * 
 * Downloads and processes the official DILG PSGC Excel file
 * URL: https://www.dilg.gov.ph/files/psgc-1q-2025-publication-datafile.xlsx
 * 
 * Usage:
 *   node src/scripts/downloadFromDILG.js [--url <url>] [--output data/psgc-data.json]
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Try to require xlsx, but fallback if not installed
let XLSX;
try {
  XLSX = require('xlsx');
} catch (e) {
  console.error('❌ The "xlsx" package is required. Install it with:');
  console.error('   npm install xlsx --save');
  process.exit(1);
}

const DILG_URL = 'https://www.dilg.gov.ph/files/psgc-1q-2025-publication-datafile.xlsx';

/**
 * Download file from URL
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`📥 Downloading from ${url}...`);
    
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        file.close();
        fs.unlinkSync(outputPath);
        return downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      // Track download progress
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r  Downloading: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
        }
      });
      
      // Pipe response to file
      response.pipe(file);
      
      // Wait for file write to complete
      file.on('finish', () => {
        file.close(() => {
          const finalSize = fs.statSync(outputPath).size;
          console.log(`\n  ✅ Download completed: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
          if (totalSize && finalSize !== totalSize) {
            console.log(`  ⚠️  Warning: Downloaded size (${finalSize}) differs from expected (${totalSize})`);
          }
          resolve(outputPath);
        });
      });
      
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(err);
    });
  });
}

/**
 * Normalize PSGC code
 */
function normalizeCode(code) {
  if (!code) return null;
  let codeStr = String(code);
  
  // Handle numeric codes (remove decimals if any)
  if (typeof code === 'number') {
    codeStr = String(Math.floor(code));
  }
  
  // Remove any non-digit characters except leading zeros
  codeStr = codeStr.replace(/\D/g, '');
  
  // Pad to 9 digits
  return codeStr.padStart(9, '0').substring(0, 9);
}

/**
 * Parse Excel file and convert to our JSON format
 */
function parseExcelToJSON(excelPath) {
  console.log('\n📖 Reading Excel file...');
  
  let workbook;
  try {
    // Try reading with different options
    workbook = XLSX.readFile(excelPath, {
      type: 'buffer',
      cellDates: false,
      cellNF: false,
      cellText: false
    });
  } catch (error) {
    // If that fails, try standard read
    try {
      workbook = XLSX.readFile(excelPath);
    } catch (err2) {
      throw new Error(`Failed to read Excel file: ${error.message}. File might be corrupted or in an unsupported format.`);
    }
  }
  
  console.log(`  Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);
  
  const result = {
    regions: [],
    provinces: [],
    cities: [],
    municipalities: [],
    barangays: []
  };
  
  // Process each sheet
  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    console.log(`\n  Processing sheet ${sheetIndex + 1}/${workbook.SheetNames.length}: "${sheetName}"`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    
    console.log(`    Found ${data.length} rows`);
    
    // Debug: Show column names for PSGC sheet (first few rows)
    if (sheetName === 'PSGC' && data.length > 0) {
      console.log(`    Columns found: ${Object.keys(data[0]).join(', ')}`);
      if (data.length > 0) {
        console.log(`    Sample row 1:`, JSON.stringify(Object.keys(data[0]).reduce((acc, key) => {
          acc[key] = data[0][key];
          return acc;
        }, {})).substring(0, 200) + '...');
      }
    }
    
    data.forEach((row, index) => {
      try {
        // DILG format uses "10-digit PSGC" or "Correspondence Code"
        // Try Correspondence Code first (9 digits), then 10-digit PSGC
        let codeStr = row['Correspondence Code'] || row['correspondence code'] || row['CORRESPONDENCE CODE'];
        if (!codeStr && (row['10-digit PSGC'] || row['10-Digit PSGC'])) {
          // Use 10-digit PSGC, remove leading zero if present
          codeStr = String(row['10-digit PSGC'] || row['10-Digit PSGC'] || '');
          // If 10 digits, remove leading zero to make it 9 digits
          if (codeStr.length === 10 && codeStr.startsWith('0')) {
            codeStr = codeStr.substring(1);
          }
        }
        
        // Fallback to other column names
        if (!codeStr) {
          codeStr = row.code || row.Code || row.CODE || 
                   row['PSGC Code'] || row['psgc code'] || row['PSGC CODE'] ||
                   row['PSGC Code/Geographic Code'] || row['PSGC'] ||
                   row.PSGC || row.psgc ||
                   row['Code'] || row['CODE'] ||
                   row['Geographic Code'] || row['geographic code'] ||
                   row['PSGC_CODE'] || row['PSGC_CODE_'];
        }
        
        const code = normalizeCode(codeStr);
        
        // DILG format uses "Name" column
        const name = (
          row.Name || row.name || row.NAME ||
          row['Geographic Area'] || row['geographic area'] || row['Geographic Area/Name'] ||
          row['Name'] || row['NAME'] ||
          row['Area'] || row.area ||
          row['Geographic Area Name'] || row['Geographic Area/Name'] ||
          row['Name/Geographic Area'] ||
          ''
        ).trim();
        
        if (!code || !name || code === '000000000') {
          return; // Skip invalid rows
        }
        
        // DILG format uses "Geographic Level" with abbreviations
        const level = (
          row['Geographic Level'] || row['geographic level'] || row['GEOGRAPHIC LEVEL'] ||
          row.level || row.Level || row.LEVEL ||
          row['Geographic Level/Type'] ||
          row['Level'] || row['LEVEL'] ||
          row['Level/Type'] || row['Type'] ||
          row.type || row.Type || row.TYPE ||
          ''
        ).toString().toLowerCase().trim();
        
        // DILG uses abbreviations: Reg, Prov, City, Mun, Bgy
        const levelAbbr = level.substring(0, 3);
        
        // Classify by code pattern and level
        const isRegion = code.match(/^\d{2}0000000$/) || levelAbbr === 'reg' || level.includes('region');
        const isProvince = code.match(/^\d{4}00000$/) || levelAbbr === 'pro' || level.includes('province');
        const isCity = code.match(/^\d{6}000$/) && (
          levelAbbr === 'cit' || level.includes('city') ||
          name.toLowerCase().includes('city') ||
          row['City Class'] || row['city class'] || row['CITY CLASS'] || row.cityClass
        );
        const isMunicipality = code.match(/^\d{6}000$/) && !isCity && (levelAbbr === 'mun' || level.includes('municipality'));
        const isBarangay = (code.match(/^\d{9}$/) && !code.match(/000$/)) || levelAbbr === 'bgy' || level.includes('barangay');
        
        const item = {
          code,
          name
        };
        
        if (isRegion) {
          item.island_group_code = normalizeCode(row['Island Group Code'] || row['island group code'] || row['ISLAND GROUP CODE'] || row.islandGroupCode || null);
          item.island_group_name = row['Island Group'] || row['island group'] || row['ISLAND GROUP'] || row.islandGroup || null;
          result.regions.push(item);
        } else if (isProvince) {
          item.region_code = code.substring(0, 2) + '0000000'; // Extract region from code
          item.island_group_code = normalizeCode(row['Island Group Code'] || row['island group code'] || row['ISLAND GROUP CODE'] || row.islandGroupCode || null);
          result.provinces.push(item);
        } else if (isCity) {
          item.province_code = code.substring(0, 4) + '00000'; // Extract province from code
          item.region_code = code.substring(0, 2) + '0000000'; // Extract region from code
          item.city_class = row['City Class'] || row['city class'] || row['CITY CLASS'] || row.cityClass || null;
          // DILG uses "Income\nClassification" (with newline)
          item.income_class = row['Income\nClassification'] || row['Income Classification'] || row['income classification'] || row['INCOME CLASSIFICATION'] || row.incomeClass || null;
          item.is_capital = (row['Capital'] === 'Yes' || row['capital'] === 'Yes' || row['CAPITAL'] === 'Yes' || row.capital === 'Yes' || row.isCapital === 1) ? 1 : 0;
          result.cities.push(item);
        } else if (isMunicipality) {
          item.province_code = code.substring(0, 4) + '00000'; // Extract province from code
          item.region_code = code.substring(0, 2) + '0000000'; // Extract region from code
          item.income_class = row['Income\nClassification'] || row['Income Classification'] || row['income classification'] || row['INCOME CLASSIFICATION'] || row.incomeClass || null;
          item.is_capital = (row['Capital'] === 'Yes' || row['capital'] === 'Yes' || row['CAPITAL'] === 'Yes' || row.capital === 'Yes' || row.isCapital === 1) ? 1 : 0;
          result.municipalities.push(item);
        } else if (isBarangay) {
          // For barangays, extract parent codes from the barangay code
          // Barangay code: RR PP MM BBB
          // City/Municipality code: RR PP MM 000
          item.city_code = null; // Will be determined during import
          item.municipality_code = null; // Will be determined during import
          item.province_code = code.substring(0, 4) + '00000'; // Extract province from code
          item.region_code = code.substring(0, 2) + '0000000'; // Extract region from code
          // DILG uses "Urban / Rural\n(based on 2020 CPH)" with newlines
          item.urban_rural = row['Urban / Rural\n(based on 2020 CPH)'] || row['Urban / Rural'] || row['urban / rural'] || row['URBAN / RURAL'] || row.urbanRural || row.classification || row['Classification'] || null;
          result.barangays.push(item);
        } else {
          // Debug unclassified items
          if (index < 5 && code && name) {
            console.log(`    ⚠️  Unclassified: code=${code}, name="${name}", level="${level}"`);
          }
        }
      } catch (error) {
        // Skip rows with errors
        if (index < 5) {
          console.log(`    ⚠️  Error parsing row ${index + 1}: ${error.message}`);
        }
      }
    });
  });
  
  console.log('\n📊 Parsed data summary:');
  console.log(`  Regions: ${result.regions.length}`);
  console.log(`  Provinces: ${result.provinces.length}`);
  console.log(`  Cities: ${result.cities.length}`);
  console.log(`  Municipalities: ${result.municipalities.length}`);
  console.log(`  Barangays: ${result.barangays.length}`);
  
  // Flatten to single array
  return [
    ...result.regions,
    ...result.provinces,
    ...result.cities,
    ...result.municipalities,
    ...result.barangays
  ];
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf('--url');
  const outputIndex = args.indexOf('--output');
  
  const url = urlIndex !== -1 ? args[urlIndex + 1] : DILG_URL;
  const output = outputIndex !== -1 ? args[outputIndex + 1] : 
                 path.join(__dirname, '../../data/psgc-data-dilg.json');
  
  const excelPath = path.join(__dirname, '../../data/psgc-dilg-temp.xlsx');
  
  console.log('🇵🇭 PSGC Data Download from DILG');
  console.log('='.repeat(70));
  console.log(`\n📁 URL: ${url}`);
  console.log(`📁 Output: ${output}\n`);
  
  try {
    // Ensure data directory exists
    const outputDir = path.dirname(output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Download Excel file
    await downloadFile(url, excelPath);
    
    // Verify file exists and has content
    if (!fs.existsSync(excelPath)) {
      throw new Error('Downloaded Excel file not found');
    }
    
    const fileStats = fs.statSync(excelPath);
    if (fileStats.size === 0) {
      throw new Error('Downloaded Excel file is empty');
    }
    
    console.log(`  Verifying file: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Wait a moment to ensure file is fully written
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Parse Excel to JSON
    const jsonData = parseExcelToJSON(excelPath);
    
    // Save JSON
    fs.writeFileSync(output, JSON.stringify(jsonData, null, 2));
    console.log(`\n💾 JSON saved to: ${output}`);
    console.log(`   File size: ${(fs.statSync(output).size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total records: ${jsonData.length}`);
    
    // Clean up temp Excel file
    if (fs.existsSync(excelPath)) {
      fs.unlinkSync(excelPath);
      console.log(`   Cleaned up temporary Excel file`);
    }
    
    console.log(`\n✅ Conversion completed successfully!`);
    console.log(`\n📦 Next steps:`);
    console.log(`1. Validate the data:`);
    console.log(`   npm run validate ${output}`);
    console.log(`\n2. Import into database:`);
    console.log(`   npm run import ${output}`);
    console.log(`\n3. Verify the import:`);
    console.log(`   npm run validate ${output}`);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    // Clean up on error
    if (fs.existsSync(excelPath)) {
      fs.unlinkSync(excelPath);
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseExcelToJSON, downloadFile };

