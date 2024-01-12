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

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
app.use(credentials)

// Cross Origin Resource Sharing
app.use(cors(corsOptions))

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: false }))

// built-in middleware for json
app.use(express.json())

//middleware for cookies
app.use(cookieParser())

// routes
app.use('/auth', require('./routes/users'))

app.use(verifyJWT)
app.use('/employee', require('./routes/employee'))
app.use('/criteria', require('./routes/criteria'))
app.use('/matrix', require('./routes/matrix'))

app.use(errorHandler)

// Testing the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err)
  } else {
    console.log('Connected to MySQL')
    connection.release()
  }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
