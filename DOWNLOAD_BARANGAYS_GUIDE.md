# Guide: Downloading Complete PSGC Data with Barangays

## Current Status

✅ **Successfully downloaded:**
- 17 Regions (need 18 - missing 1)
- 82 Provinces ✅ (CORRECT!)
- 148 Cities (need 149 - missing 1)
- 1,486 Municipalities (need 1,493 - missing 7)
- ❌ **0 Barangays** (need 42,011 - **ALL MISSING**)

## Problem

The PSGC Cloud API (`psgc.cloud`) is experiencing:
- **Rate limiting** (HTTP 429) - Too many requests
- **404 errors** - Wrong endpoint format for barangays
- **500 errors** - Server errors on `/barangays` endpoint

## Solutions

### Option 1: Wait and Retry (Recommended if you have time)

The rate limits reset after some time (usually 15-60 minutes).

**Step 1:** Wait 30-60 minutes

**Step 2:** Run the alternative barangays fetcher:
```bash
npm run fetch-barangays data/psgc-data-complete.json data/psgc-data-final.json
```

This script:
- Fetches in smaller batches (3 provinces at a time)
- Waits 10 seconds between batches
- Uses exponential backoff for rate limit errors
- Tries multiple endpoint formats

### Option 2: Manual Download from PSA Website (Most Reliable)

**Step 1:** Visit the official PSA website:
```
https://psa.gov.ph/classification/psgc/
```

**Step 2:** Download the latest PSGC publication:
- Look for "Philippine Standard Geographic Code as of 30 September 2025"
- Usually available as an Excel (.xlsx) file
- Contains all 42,011 barangays

**Step 3:** Convert Excel to JSON format

**Option A:** Use online converter
- Upload Excel file to: https://www.convertcsv.com/excel-to-json.htm
- Download as JSON

**Option B:** Use Excel/Python to convert
- Export each sheet to CSV
- Convert CSV to JSON using your preferred method

**Step 4:** Ensure the JSON matches our format:
```json
[
  {
    "code": "123456789",
    "name": "Barangay Name",
    "city_code": "123456000",
    "municipality_code": null,
    "province_code": "123400000",
    "region_code": "120000000",
    "urban_rural": "Urban"
  }
]
```

**Step 5:** Combine with existing data:
```bash
# Your existing data has regions, provinces, cities, municipalities
# Add the barangays from the PSA download
```

**Step 6:** Import:
```bash
npm run import data/psgc-data-final.json
```

### Option 3: Use Alternative Data Sources

Try community-maintained PSGC datasets on GitHub:
- Search for "psgc philippines json" on GitHub
- Verify they include all 42,011 barangays
- Ensure they match PSA 2025 standards

### Option 4: Use What We Have (For Testing/Development)

If you just need to test the API structure:
```bash
# Import current data (without barangays)
npm run import data/psgc-data-complete.json

# The API will work, but barangay endpoints will return empty
```

## Validation After Download

Once you have complete data:

```bash
# 1. Validate the data file
npm run validate data/psgc-data-final.json

# 2. Import into database
npm run import data/psgc-data-final.json

# 3. Verify the import
npm run validate data/psgc-data-final.json
```

## Expected Results

After successful import, you should see:
- ✅ 18 Regions
- ✅ 82 Provinces  
- ✅ 149 Cities
- ✅ 1,493 Municipalities
- ✅ 42,011 Barangays

## Troubleshooting

### If rate limits persist:
1. Wait longer (1-2 hours)
2. Use a VPN or different IP address
3. Use manual download from PSA (Option 2)

### If data format doesn't match:
1. Check the `src/scripts/importPSGC.js` for expected format
2. Use `src/scripts/downloadPSGC.js` to convert Excel/CSV to our format
3. Validate structure before importing

### If import fails:
1. Run diagnostics: `npm run diagnose data/psgc-data-final.json`
2. Check for missing parent references
3. Ensure all PSGC codes are properly formatted (9 digits)

## Quick Commands Reference

```bash
# Download from PSGC Cloud API
npm run download-psa

# Fetch barangays (after waiting for rate limits)
npm run fetch-barangays <input> <output>

# Validate data
npm run validate <file>

# Import data
npm run import <file>

# Diagnose issues
npm run diagnose <file>
```

## Notes

- The PSGC Cloud API is a third-party service and may have limitations
- Official PSA website is the most authoritative source
- Rate limits are common with free APIs
- Manual download ensures you get the complete, official dataset

