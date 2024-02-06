const mysql = require('mysql2')

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'firman25',
  database: 'kkp_2024',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Handle errors
pool.on('error', (err) => {
  console.error('Pool Error:', err)
})

module.exports = pool
