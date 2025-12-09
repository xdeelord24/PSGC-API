# PSGC API Usage Examples

This document provides practical examples of using the PSGC API endpoints.

## Base URL

All examples assume the API is running at `http://localhost:3000`

## 1. Regions

### Get all regions
```bash
curl http://localhost:3000/api/v1/regions
```

### Get a specific region
```bash
curl http://localhost:3000/api/v1/regions/130000000
```

### Get provinces in a region
```bash
curl http://localhost:3000/api/v1/regions/130000000/provinces
```

### Get cities in a region
```bash
curl http://localhost:3000/api/v1/regions/130000000/cities
```

### Get municipalities in a region
```bash
curl http://localhost:3000/api/v1/regions/040000000/municipalities
```

## 2. Provinces

### Get all provinces
```bash
curl http://localhost:3000/api/v1/provinces
```

### Get a specific province
```bash
curl http://localhost:3000/api/v1/provinces/137400000
```

### Get provinces by region
```bash
curl http://localhost:3000/api/v1/provinces/region/130000000
```

### Get cities in a province
```bash
curl http://localhost:3000/api/v1/provinces/137400000/cities
```

### Get municipalities in a province
```bash
curl http://localhost:3000/api/v1/provinces/042100000/municipalities
```

### Get barangays in a province
```bash
curl http://localhost:3000/api/v1/provinces/137400000/barangays
```

## 3. Cities

### Get all cities
```bash
curl http://localhost:3000/api/v1/cities
```

### Get a specific city
```bash
curl http://localhost:3000/api/v1/cities/137401000
```

### Get cities by province
```bash
curl http://localhost:3000/api/v1/cities/province/137400000
```

### Get cities by region
```bash
curl http://localhost:3000/api/v1/cities/region/130000000
```

### Get barangays in a city
```bash
curl http://localhost:3000/api/v1/cities/137401000/barangays
```

## 4. Municipalities

### Get all municipalities
```bash
curl http://localhost:3000/api/v1/municipalities
```

### Get a specific municipality
```bash
curl http://localhost:3000/api/v1/municipalities/042111000
```

### Get municipalities by province
```bash
curl http://localhost:3000/api/v1/municipalities/province/042100000
```

### Get municipalities by region
```bash
curl http://localhost:3000/api/v1/municipalities/region/040000000
```

### Get barangays in a municipality
```bash
curl http://localhost:3000/api/v1/municipalities/042111000/barangays
```

## 5. Barangays

### Get all barangays (limited to 1000)
```bash
curl http://localhost:3000/api/v1/barangays
```

### Get all barangays with custom limit
```bash
curl "http://localhost:3000/api/v1/barangays?limit=500"
```

### Get a specific barangay
```bash
curl http://localhost:3000/api/v1/barangays/137401001
```

### Get barangays by city
```bash
curl http://localhost:3000/api/v1/barangays/city/137401000
```

### Get barangays by municipality
```bash
curl http://localhost:3000/api/v1/barangays/municipality/042111000
```

### Get barangays by province
```bash
curl http://localhost:3000/api/v1/barangays/province/137400000
```

### Get barangays by region
```bash
curl http://localhost:3000/api/v1/barangays/region/130000000
```

## 6. Search

### Search across all entities
```bash
curl "http://localhost:3000/api/v1/search?q=manila"
```

### Search only regions
```bash
curl "http://localhost:3000/api/v1/search?q=metro&type=regions"
```

### Search only cities
```bash
curl "http://localhost:3000/api/v1/search?q=calamba&type=cities"
```

### Search with custom limit
```bash
curl "http://localhost:3000/api/v1/search?q=laguna&type=barangays&limit=50"
```

## JavaScript/Node.js Examples

### Using fetch API
```javascript
// Get all regions
async function getAllRegions() {
  const response = await fetch('http://localhost:3000/api/v1/regions');
  const data = await response.json();
  console.log(data);
}

// Search for locations
async function searchLocations(query) {
  const response = await fetch(
    `http://localhost:3000/api/v1/search?q=${encodeURIComponent(query)}`
  );
  const data = await response.json();
  return data;
}

// Get barangays in a city
async function getCityBarangays(cityCode) {
  const response = await fetch(
    `http://localhost:3000/api/v1/cities/${cityCode}/barangays`
  );
  const data = await response.json();
  return data;
}
```

### Using axios
```javascript
const axios = require('axios');

// Get province with details
async function getProvince(code) {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/v1/provinces/${code}`
    );
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Get full hierarchy (region -> province -> city -> barangays)
async function getFullHierarchy(barangayCode) {
  const barangay = await axios.get(
    `http://localhost:3000/api/v1/barangays/${barangayCode}`
  );
  return barangay.data;
}
```

## Python Examples

### Using requests library
```python
import requests

BASE_URL = "http://localhost:3000/api/v1"

# Get all regions
def get_all_regions():
    response = requests.get(f"{BASE_URL}/regions")
    return response.json()

# Search for locations
def search_locations(query, entity_type="all"):
    params = {"q": query, "type": entity_type}
    response = requests.get(f"{BASE_URL}/search", params=params)
    return response.json()

# Get cities in a province
def get_province_cities(province_code):
    response = requests.get(
        f"{BASE_URL}/provinces/{province_code}/cities"
    )
    return response.json()
```

## PHP Examples

```php
<?php
$baseUrl = "http://localhost:3000/api/v1";

// Get all regions
function getAllRegions() {
    global $baseUrl;
    $response = file_get_contents("$baseUrl/regions");
    return json_decode($response, true);
}

// Search for locations
function searchLocations($query, $type = "all") {
    global $baseUrl;
    $url = "$baseUrl/search?q=" . urlencode($query) . "&type=$type";
    $response = file_get_contents($url);
    return json_decode($response, true);
}

// Get barangays in a city
function getCityBarangays($cityCode) {
    global $baseUrl;
    $response = file_get_contents("$baseUrl/cities/$cityCode/barangays");
    return json_decode($response, true);
}
?>
```

## Response Examples

### Successful Response
```json
{
  "data": [
    {
      "code": "130000000",
      "name": "National Capital Region",
      "island_group_code": "1",
      "island_group_name": "Luzon",
      "created_at": "2024-01-01 00:00:00",
      "updated_at": "2024-01-01 00:00:00"
    }
  ],
  "count": 1
}
```

### Hierarchical Response
```json
{
  "data": [
    {
      "code": "137401000",
      "name": "Manila",
      "province_code": "137400000",
      "region_code": "130000000",
      "city_class": "HUC",
      "is_capital": 1
    }
  ],
  "count": 1,
  "province": {
    "code": "137400000",
    "name": "Metro Manila"
  }
}
```

### Error Response
```json
{
  "error": "Not found",
  "message": "Province with code 999999999 not found"
}
```

## Tips

1. **Pagination**: For large datasets (especially barangays), use the `limit` parameter
2. **Caching**: Consider implementing client-side caching for frequently accessed data
3. **Error Handling**: Always check for error responses and handle them appropriately
4. **Rate Limiting**: Be aware of the 100 requests per 15 minutes limit
5. **Data Updates**: PSGC codes may change over time. Always refer to the latest PSA publication

