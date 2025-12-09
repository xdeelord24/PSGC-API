const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/psgc.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
function getDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) reject(err);
          else resolve(db);
        });
      }
    });
  });
}

// Initialize database schema
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    getDatabase().then(db => {
      db.serialize(() => {
        let completed = 0;
        const totalOps = 15; // 6 tables + 9 indexes
        
        const checkComplete = (err) => {
          if (err) {
            reject(err);
            return;
          }
          completed++;
          if (completed === totalOps) {
            resolve(db);
          }
        };

        db.run(`
          CREATE TABLE IF NOT EXISTS regions (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            island_group_code TEXT,
            island_group_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `, checkComplete);

        db.run(`
          CREATE TABLE IF NOT EXISTS provinces (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            region_code TEXT NOT NULL,
            island_group_code TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (region_code) REFERENCES regions(code)
          );
        `, checkComplete);

        db.run(`
          CREATE TABLE IF NOT EXISTS districts (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            province_code TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (province_code) REFERENCES provinces(code)
          );
        `, checkComplete);

        db.run(`
          CREATE TABLE IF NOT EXISTS cities (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            province_code TEXT,
            district_code TEXT,
            region_code TEXT NOT NULL,
            city_class TEXT,
            income_class TEXT,
            is_capital INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (province_code) REFERENCES provinces(code),
            FOREIGN KEY (district_code) REFERENCES districts(code),
            FOREIGN KEY (region_code) REFERENCES regions(code)
          );
        `, checkComplete);

        db.run(`
          CREATE TABLE IF NOT EXISTS municipalities (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            province_code TEXT NOT NULL,
            district_code TEXT,
            region_code TEXT NOT NULL,
            income_class TEXT,
            is_capital INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (province_code) REFERENCES provinces(code),
            FOREIGN KEY (district_code) REFERENCES districts(code),
            FOREIGN KEY (region_code) REFERENCES regions(code)
          );
        `, checkComplete);

        db.run(`
          CREATE TABLE IF NOT EXISTS barangays (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            city_code TEXT,
            municipality_code TEXT,
            province_code TEXT NOT NULL,
            region_code TEXT NOT NULL,
            urban_rural TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (city_code) REFERENCES cities(code),
            FOREIGN KEY (municipality_code) REFERENCES municipalities(code),
            FOREIGN KEY (province_code) REFERENCES provinces(code),
            FOREIGN KEY (region_code) REFERENCES regions(code)
          );
        `, checkComplete);

        // Create indexes
        db.run(`CREATE INDEX IF NOT EXISTS idx_provinces_region ON provinces(region_code);`, checkComplete);
        db.run(`CREATE INDEX IF NOT EXISTS idx_cities_province ON cities(province_code);`, checkComplete);
        db.run(`CREATE INDEX IF NOT EXISTS idx_cities_region ON cities(region_code);`, checkComplete);
        db.run(`CREATE INDEX IF NOT EXISTS idx_municipalities_province ON municipalities(province_code);`, checkComplete);
        db.run(`CREATE INDEX IF NOT EXISTS idx_municipalities_region ON municipalities(region_code);`, checkComplete);
        db.run(`CREATE INDEX IF NOT EXISTS idx_barangays_city ON barangays(city_code);`, checkComplete);
        db.run(`CREATE INDEX IF NOT EXISTS idx_barangays_municipality ON barangays(municipality_code);`, checkComplete);
        db.run(`CREATE INDEX IF NOT EXISTS idx_barangays_province ON barangays(province_code);`, checkComplete);
        db.run(`CREATE INDEX IF NOT EXISTS idx_barangays_region ON barangays(region_code);`, checkComplete);
      });
    }).catch(reject);
  });
}

// Cache for initialized database
let dbInstance = null;
let dbPromise = null;

// Ensure database is initialized
async function ensureInitialized() {
  if (!dbInstance) {
    if (!dbPromise) {
      dbPromise = initializeDatabase();
    }
    dbInstance = await dbPromise;
  }
  return dbInstance;
}

// Export a promise-based database interface
module.exports = {
  getDatabase,
  initializeDatabase: async () => {
    dbInstance = await ensureInitialized();
    return dbInstance;
  },
  
  // Helper methods for compatibility
  run: async (sql, params = []) => {
    const db = await ensureInitialized();
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  
  get: async (sql, params = []) => {
    const db = await ensureInitialized();
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  all: async (sql, params = []) => {
    const db = await ensureInitialized();
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};
