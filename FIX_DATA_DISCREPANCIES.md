# Fixing PSGC Data Discrepancies

## Problem Summary

Your current `data/psgc-data.json` file is **incomplete**:
- **Current**: 1,733 records
- **Expected**: ~42,000+ records (based on PSA 2025 standards)

### Missing Data:
- **Regions**: 17 (need 18) - Missing 1
- **Provinces**: 60 (need 82) - Missing 22
- **Cities**: 86 (need 149) - Missing 63
- **Municipalities**: 939 (need 1,493) - Missing 554
- **Barangays**: 490 (need 42,011) - Missing 41,521 ⚠️ **CRITICAL**

## Solution: Fetch Complete Data

### Option 1: Fetch from PSGC Cloud API (Recommended)

The PSGC Cloud API provides complete PSGC data. Run:

```bash
npm run fetch-data --output data/psgc-data-complete.json
```

This will:
1. Fetch all regions, provinces, cities, and municipalities
2. Fetch ALL barangays from ALL provinces (this may take 5-10 minutes)
3. Save to `data/psgc-data-complete.json`

Then import the complete data:
```bash
npm run import data/psgc-data-complete.json
```

### Option 2: Download from PSA Website (Manual)

1. Visit: https://psa.gov.ph/classification/psgc/
2. Download the latest PSGC publication (Excel file)
3. Convert Excel to JSON format
4. Import using: `npm run import <your-file.json>`

### Option 3: Use Existing Complete Dataset

If you have access to a complete PSGC JSON file from another source, you can import it directly:
```bash
npm run import <path-to-complete-file.json>
```

## After Fetching Complete Data

1. **Validate the new data file**:
   ```bash
   npm run validate data/psgc-data-complete.json
   ```

2. **Check for discrepancies**:
   ```bash
   npm run diagnose data/psgc-data-complete.json
   ```

3. **Import into database**:
   ```bash
   npm run import data/psgc-data-complete.json
   ```

4. **Verify database counts**:
   ```bash
   npm run validate data/psgc-data-complete.json
   ```

## Expected Results After Fix

After importing complete data, you should see:
- ✅ **Regions**: 18 (exact match)
- ✅ **Provinces**: 82 (exact match)
- ✅ **Cities**: 149 (exact match)
- ✅ **Municipalities**: 1,493 (exact match)
- ✅ **Barangays**: 42,011 (exact match)

## Notes

- The fetch process may take 5-10 minutes due to rate limiting
- The complete data file will be ~10-20 MB
- Make sure you have a stable internet connection
- If the fetch fails, try again (API may have rate limits)

