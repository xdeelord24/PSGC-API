# PSGC Data Acquisition Guide

This guide explains how to obtain and import the latest PSGC data from the Philippine Statistics Authority (PSA).

## Official Data Source

The Philippine Statistics Authority (PSA) is the official source of PSGC data:
- **Website**: https://psa.gov.ph/classification/psgc/
- **Updates**: The PSGC is updated regularly, typically quarterly
- **Format**: Data is usually provided in Excel (.xlsx) format

## Steps to Acquire Data

### 1. Download from PSA Website

1. Visit https://psa.gov.ph/classification/psgc/
2. Navigate to the "Publications" or "Downloads" section
3. Download the latest PSGC publication file (usually an Excel file)
4. The file typically contains multiple sheets for different administrative levels

### 2. Data Structure

The PSGC Excel file usually contains the following columns:
- **Code**: The 9-digit PSGC code
- **Name**: The name of the geographic entity
- **Geographic Level**: Type (Region, Province, City/Municipality, Barangay)
- **Parent Code**: Reference to parent entity
- Additional metadata (Income Class, Urban/Rural classification, etc.)

### 3. Data Preparation

#### Option A: Convert Excel to JSON

1. Open the Excel file
2. Convert each sheet to CSV or JSON format
3. Ensure the data structure matches our database schema:
   - `code`: PSGC code (9 digits)
   - `name`: Entity name
   - `region_code`: Parent region code (for provinces, cities, municipalities, barangays)
   - `province_code`: Parent province code (for cities, municipalities, barangays)
   - `city_code`: Parent city code (for barangays in cities)
   - `municipality_code`: Parent municipality code (for barangays in municipalities)
   - Additional fields as available (island_group_code, income_class, etc.)

#### Option B: Manual Database Population

You can also manually populate the database using SQL INSERT statements if you have the data in another format.

### 4. Import Data

#### Using the Import Script

Once you have the data in JSON or CSV format:

```bash
# Import from JSON file
npm run import data/psgc-data.json --format json

# Import from CSV file
npm run import data/psgc-data.csv --format csv
```

#### Manual Import

If you prefer to import directly using SQL:

1. Open the SQLite database:
```bash
sqlite3 data/psgc.db
```

2. Import your data using `.import` command or INSERT statements

### 5. Data Validation

After importing, verify the data:

```bash
# Check counts
sqlite3 data/psgc.db "SELECT COUNT(*) FROM regions;"
sqlite3 data/psgc.db "SELECT COUNT(*) FROM provinces;"
sqlite3 data/psgc.db "SELECT COUNT(*) FROM cities;"
sqlite3 data/psgc.db "SELECT COUNT(*) FROM municipalities;"
sqlite3 data/psgc.db "SELECT COUNT(*) FROM barangays;"

# Test API endpoints
curl http://localhost:3000/api/v1/regions
```

## Sample Data Structure

### Region Example
```json
{
  "code": "130000000",
  "name": "National Capital Region",
  "island_group_code": "1",
  "island_group_name": "Luzon"
}
```

### Province Example
```json
{
  "code": "137400000",
  "name": "Metro Manila",
  "region_code": "130000000",
  "island_group_code": "1"
}
```

### City Example
```json
{
  "code": "137401000",
  "name": "Manila",
  "province_code": "137400000",
  "region_code": "130000000",
  "city_class": "HUC",
  "is_capital": 1
}
```

### Municipality Example
```json
{
  "code": "042111000",
  "name": "Bay",
  "province_code": "042100000",
  "region_code": "040000000",
  "is_capital": 0
}
```

### Barangay Example
```json
{
  "code": "137401001",
  "name": "Binondo",
  "city_code": "137401000",
  "province_code": "137400000",
  "region_code": "130000000",
  "urban_rural": "Urban"
}
```

## PSGC Code Structure

The PSGC uses a 9-digit hierarchical coding system:

- **Positions 1-2**: Region code (01-18)
- **Positions 3-4**: Province/District code (00-99)
- **Positions 5-6**: City/Municipality code (00-99)
- **Positions 7-9**: Barangay code (001-999)

Examples:
- `130000000`: National Capital Region (Region level - all zeros after region)
- `137400000`: Metro Manila Province (Province level - zeros for city/municipality and barangay)
- `137401000`: Manila City (City level - zeros for barangay)
- `137401001`: Binondo Barangay (Barangay level)

## Data Update Process

### Regular Updates

1. **Check PSA Website**: Regularly visit the PSA website for updates
2. **Download Latest Data**: Download the most recent publication
3. **Backup Current Database**: Always backup before updating
4. **Import New Data**: Use the import script with the `INSERT OR REPLACE` strategy
5. **Validate**: Test the API endpoints after import

### Update Script Example

```bash
# Backup current database
cp data/psgc.db data/psgc.db.backup

# Import new data
npm run import data/latest-psgc-data.json

# Verify
curl http://localhost:3000/api/v1/regions | jq '.count'
```

## Troubleshooting

### Common Issues

1. **Code Format Mismatch**: Ensure PSGC codes are exactly 9 digits
2. **Foreign Key Violations**: Ensure parent entities (regions, provinces) exist before importing children
3. **Character Encoding**: Ensure UTF-8 encoding for Filipino characters
4. **Data Type Mismatches**: Check that numeric fields are properly formatted

### Data Quality Checks

```sql
-- Check for orphaned provinces (no region)
SELECT * FROM provinces WHERE region_code NOT IN (SELECT code FROM regions);

-- Check for orphaned cities/municipalities (no province)
SELECT * FROM cities WHERE province_code NOT IN (SELECT code FROM provinces);

-- Check for orphaned barangays (no city/municipality/province)
SELECT * FROM barangays 
WHERE (city_code IS NULL AND municipality_code IS NULL)
   OR province_code NOT IN (SELECT code FROM provinces);
```

## Alternative Data Sources

While PSA is the official source, you may also find:
- Community-maintained PSGC datasets
- GitHub repositories with processed PSGC data
- Third-party APIs (but always verify against official PSA data)

**Important**: Always verify data accuracy against the official PSA publication.

## Support

For questions about PSGC data:
- **PSA Contact**: Check the PSA website for official contact information
- **PSGC Documentation**: https://psa.gov.ph/classification/psgc/

For API-related issues:
- Check the main README.md
- Review EXAMPLES.md for usage examples

