# PSGC Data Import Instructions

## ✅ Data Successfully Fetched!

We've successfully fetched **1,733 PSGC records** from PSGC Cloud API:
- **17 Regions**
- **82 Provinces** 
- **148 Cities**
- **1,486 Municipalities**

The data has been saved to: `data/psgc-data.json`

## Next Steps to Import Data

### Option 1: Install Dependencies and Import (Recommended)

**For Windows users**, you'll need Visual Studio Build Tools for `better-sqlite3`:

1. **Install Visual Studio Build Tools:**
   - Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - Install with "Desktop development with C++" workload
   - OR install Visual Studio Community (which includes build tools)

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Import the fetched data:**
   ```bash
   npm run import data/psgc-data.json
   ```

   Or:
   ```bash
   node src/scripts/importPSGC.js data/psgc-data.json
   ```

### Option 2: Use Pre-built Binaries (Alternative)

If you can't install build tools, you can try:

```bash
npm install better-sqlite3 --build-from-source=false
```

Or use an alternative SQLite package temporarily.

### Option 3: Manual Database Import

If you have SQLite tools installed, you can manually import:

1. **Create database schema:**
   ```bash
   node -e "require('./src/database/db')"
   ```

2. **Convert JSON to SQL INSERT statements** (create a small script) and execute them.

### Option 4: Use Alternative Database

You can modify the code to use a different database:
- PostgreSQL
- MySQL
- MongoDB
- Or any other database supported by Node.js

## Verifying the Import

After importing, verify the data:

```bash
# Start the API server
npm start

# In another terminal, test the API
curl http://localhost:3000/api/v1/regions
curl http://localhost:3000/api/v1/provinces
curl http://localhost:3000/api/v1/cities
```

## Fetching More Data

### To Fetch Fresh Data:

```bash
node src/scripts/fetchFromPSGCCloud.js
```

This will fetch the latest data from PSGC Cloud API and save it to `data/psgc-data.json`.

### To Fetch Barangays:

The barangays endpoint on PSGC Cloud API is currently not working. To get barangays:

1. **Download from PSA website:**
   - Visit: https://psa.gov.ph/classification/psgc/
   - Download the latest PSGC publication (Excel file)
   - Convert to JSON format
   - Import using the import script

2. **Or use a different source:**
   - Look for GitHub repositories with PSGC barangays data
   - Check other PSGC API services

## Current Data Status

✅ **Fetched and Ready:**
- Regions: 17
- Provinces: 82  
- Cities: 148
- Municipalities: 1,486

❌ **Not Available:**
- Barangays: 0 (API endpoint unavailable)

## Troubleshooting

### Issue: `better-sqlite3` won't install

**Solution:** Install Visual Studio Build Tools (see Option 1 above)

### Issue: Import fails with foreign key errors

**Solution:** The import script should handle this, but if you get errors:
- Make sure regions are imported before provinces
- Make sure provinces are imported before cities/municipalities
- Make sure cities/municipalities are imported before barangays

### Issue: Data format mismatch

**Solution:** The fetch script converts PSGC Cloud format to our format. If you have data from another source, you may need to adjust the conversion logic in `fetchFromPSGCCloud.js`.

## Additional Resources

- **PSGC Official Site:** https://psa.gov.ph/classification/psgc/
- **PSGC Cloud API:** https://psgc.cloud/
- **API Documentation:** See `README.md` in this project

