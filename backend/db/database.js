const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'foodlink';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

// FIX 1: the pool now has `database` set, so EVERY pooled connection uses the
// foodlink DB. Before, only the one connection that ran `USE foodlink` had it;
// any other connection gave "No database selected" -> HTTP 500 on login/listings.
// FIX 2: timezone 'Z' + SET time_zone='+00:00' keeps all DATETIMEs in UTC so
// expiry times and NOW() comparisons agree (listings were vanishing/expiring early).
const pool = mysql.createPool({
  ...dbConfig,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  // DECIMAL columns come back as numbers instead of strings
  decimalNumbers: true
});

pool.on('connection', (c) => {
  c.query("SET time_zone = '+00:00'");
});

const initDB = async () => {
  // Create the database (if missing) using a connection that has no DB selected
  const bootstrap = await mysql.createConnection(dbConfig);
  try {
    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  } finally {
    await bootstrap.end();
  }

  const conn = await pool.getConnection();
  try {

    await conn.query(`
      CREATE TABLE IF NOT EXISTS Cities (
        city_id INT AUTO_INCREMENT PRIMARY KEY,
        city_name VARCHAR(100) NOT NULL UNIQUE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(200) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('donor','ngo') NOT NULL,
        city_id INT,
        state VARCHAR(100),
        pincode VARCHAR(10),
        contact VARCHAR(15),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (city_id) REFERENCES Cities(city_id) ON DELETE SET NULL
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS Food_Listings (
        food_id INT AUTO_INCREMENT PRIMARY KEY,
        donor_id INT NOT NULL,
        food_name VARCHAR(200) NOT NULL,
        food_type VARCHAR(100),
        is_veg TINYINT(1) NOT NULL DEFAULT 1,
        total_quantity DECIMAL(10,2) NOT NULL,
        remaining_quantity DECIMAL(10,2) NOT NULL,
        unit VARCHAR(30) DEFAULT 'kg',
        expiry_time DATETIME NOT NULL,
        city_id INT,
        state VARCHAR(100),
        pincode VARCHAR(10),
        status ENUM('available','partially_allocated','fully_allocated','expired') DEFAULT 'available',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (donor_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (city_id) REFERENCES Cities(city_id) ON DELETE SET NULL
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS Requests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        food_id INT NOT NULL,
        ngo_id INT NOT NULL,
        requested_quantity DECIMAL(10,2) NOT NULL,
        allocated_quantity DECIMAL(10,2) DEFAULT 0,
        status ENUM('pending','approved','partially_approved','rejected','cancelled') DEFAULT 'pending',
        request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (food_id) REFERENCES Food_Listings(food_id) ON DELETE CASCADE,
        FOREIGN KEY (ngo_id) REFERENCES Users(user_id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS Transactions (
        transaction_id INT AUTO_INCREMENT PRIMARY KEY,
        food_id INT NOT NULL,
        donor_id INT NOT NULL,
        ngo_id INT NOT NULL,
        allocated_quantity DECIMAL(10,2) NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (food_id) REFERENCES Food_Listings(food_id) ON DELETE CASCADE,
        FOREIGN KEY (donor_id) REFERENCES Users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (ngo_id) REFERENCES Users(user_id) ON DELETE CASCADE
      )
    `);

    // Seed some cities
    await conn.query(`
      INSERT IGNORE INTO Cities (city_name) VALUES
      ('Mumbai'),('Delhi'),('Bangalore'),('Chennai'),('Kolkata'),
      ('Hyderabad'),('Pune'),('Ahmedabad'),('Jaipur'),('Lucknow'),
      ('Patna'),('Bhopal'),('Indore'),('Nagpur'),('Surat')
    `);

    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('DB Init Error:', err);
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { pool, initDB };
