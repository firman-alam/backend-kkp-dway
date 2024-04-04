const express = require('express')
const app = express()
const pool = require('./config/dbConfig')
const cors = require('cors')
const corsOptions = require('./config/corsOptions')
const errorHandler = require('./middleware/errorHandler')
const verifyJWT = require('./middleware/verifyJWT')
const cookieParser = require('cookie-parser')
const credentials = require('./middleware/credentials')
const PORT = process.env.PORT || 9000

// custom middleware logger
// app.use(logger)

app.use(credentials)
app.use(cors(corsOptions))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cookieParser())

// routes
app.use('/auth', require('./routes/users'))

// app.use(verifyJWT)
app.use('/divisi', require('./routes/divisi'))

app.use(errorHandler)

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err)
  } else {
    console.log('Connected to MySQL')
    connection.release()
  }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
