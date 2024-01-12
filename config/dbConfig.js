const mysql = require('mysql2')

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'kkp_2024',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Log when a connection is acquired from the pool
pool.on('acquire', (connection) => {
  console.log(`Connection ${connection.threadId} acquired from the pool`)
})

// Log when a connection is released back to the pool
pool.on('release', (connection) => {
  console.log(`Connection ${connection.threadId} released back to the pool`)
})

// Handle errors
pool.on('error', (err) => {
  console.error('Pool Error:', err)
})

module.exports = pool
