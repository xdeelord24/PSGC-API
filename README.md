# Philippine Standard Geographic Code (PSGC) API

A RESTful API for accessing updated Philippine Standard Geographic Code (PSGC) data from the Philippine Statistics Authority (PSA).

## Features

- ✅ Complete PSGC hierarchy: Regions, Provinces, Cities, Municipalities, and Barangays
- ✅ RESTful API design with clear endpoints
- ✅ Search functionality across all geographic entities
- ✅ Hierarchical data relationships
- ✅ SQLite database for fast queries
- ✅ Rate limiting for API protection
- ✅ CORS enabled
- ✅ Error handling and validation

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd PSGC-API
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Configure environment variables:
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
DATABASE_PATH=./data/psgc.db
```

4. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000/api`

## Database Setup

The API uses SQLite database. The database file will be automatically created when you first run the server. However, you need to populate it with PSGC data from the PSA.

### Data Import

You'll need to import PSGC data from the Philippine Statistics Authority. The PSA provides PSGC data in Excel format. You'll need to:

1. Download the latest PSGC publication file from: https://psa.gov.ph/classification/psgc/
2. Convert it to CSV/JSON format
3. Use a data import script to populate the database

A sample import script will be provided separately, or you can create your own based on the PSA data structure.

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Regions

- `GET /regions` - Get all regions
- `GET /regions/:code` - Get region by code
- `GET /regions/:code/provinces` - Get provinces in a region
- `GET /regions/:code/cities` - Get cities in a region
- `GET /regions/:code/municipalities` - Get municipalities in a region

### Provinces

- `GET /provinces` - Get all provinces
- `GET /provinces/:code` - Get province by code
- `GET /provinces/region/:regionCode` - Get provinces by region code
- `GET /provinces/:code/cities` - Get cities in a province
- `GET /provinces/:code/municipalities` - Get municipalities in a province
- `GET /provinces/:code/barangays` - Get barangays in a province

### Cities

- `GET /cities` - Get all cities
- `GET /cities/:code` - Get city by code
- `GET /cities/province/:provinceCode` - Get cities by province code
- `GET /cities/region/:regionCode` - Get cities by region code
- `GET /cities/:code/barangays` - Get barangays in a city

### Municipalities

- `GET /municipalities` - Get all municipalities
- `GET /municipalities/:code` - Get municipality by code
- `GET /municipalities/province/:provinceCode` - Get municipalities by province code
- `GET /municipalities/region/:regionCode` - Get municipalities by region code
- `GET /municipalities/:code/barangays` - Get barangays in a municipality

### Barangays

- `GET /barangays` - Get all barangays (default limit: 1000)
- `GET /barangays/:code` - Get barangay by code
- `GET /barangays/city/:cityCode` - Get barangays by city code
- `GET /barangays/municipality/:municipalityCode` - Get barangays by municipality code
- `GET /barangays/province/:provinceCode` - Get barangays by province code (default limit: 1000)
- `GET /barangays/region/:regionCode` - Get barangays by region code (default limit: 1000)

### Search

- `GET /search?q=query&type=all&limit=20` - Search across all entities
  - `q` (required): Search query
  - `type` (optional): Filter by type (`all`, `regions`, `provinces`, `cities`, `municipalities`, `barangays`)
  - `limit` (optional): Maximum results per type (default: 20)

### Utility Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api` - API information and available endpoints

## Example Requests

### Get all regions
```bash
curl http://localhost:3000/api/v1/regions
```

### Get a specific province
```bash
curl http://localhost:3000/api/v1/provinces/012800000
```

### Get cities in a province
```bash
curl http://localhost:3000/api/v1/provinces/012800000/cities
```

### Get barangays in a city
```bash
curl http://localhost:3000/api/v1/cities/012801000/barangays
```

### Search for locations
```bash
# Search all
curl "http://localhost:3000/api/v1/search?q=manila"

# Search only cities
curl "http://localhost:3000/api/v1/search?q=manila&type=cities"
```

## Response Format

All successful responses follow this format:

```json
{
  "data": [...],
  "count": 10
}
```

For single item requests:

```json
{
  "data": {
    "code": "012800000",
    "name": "Metro Manila",
    ...
  }
}
```

For hierarchical requests (e.g., region with provinces):

```json
{
  "data": [...],
  "count": 17,
  "region": {
    "code": "130000000",
    "name": "National Capital Region"
  }
}
```

Error responses:

```json
{
  "error": "Not found",
  "message": "Region with code 999999999 not found"
}
```

## Rate Limiting

The API implements rate limiting:
- **Limit**: 100 requests per 15 minutes per IP address
- Exceeding the limit will return a `429 Too Many Requests` response

## Data Source

This API is designed to work with data from the Philippine Statistics Authority (PSA):
- Official PSGC Publication: https://psa.gov.ph/classification/psgc/
- Data is updated periodically by the PSA
- Always refer to the official PSA website for the latest data

## Project Structure

```
PSGC-API/
├── src/
│   ├── controllers/      # Request handlers
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── database/        # Database setup
│   └── server.js        # Main server file
├── data/                # Database files (created automatically)
├── package.json
└── README.md
```

## Technologies Used

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite (better-sqlite3)** - Database
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting

## Contributing

Contributions are welcome! Please ensure that:
1. Your code follows the existing style
2. You add appropriate error handling
3. You update documentation as needed

## License

MIT License

## Disclaimer

This API is an independent implementation and is not officially affiliated with the Philippine Statistics Authority. Always verify critical data with the official PSA sources.

## Support

For issues and questions:
- Check the official PSA website for data updates: https://psa.gov.ph/classification/psgc/
- Open an issue in the repository

