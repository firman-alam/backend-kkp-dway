const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const pool = require('../config/dbConfig')

const SignUp = async (req, res) => {
  const { username, password } = req.body

  if (!username || !password)
    return res.status(400).json({ message: 'Semua field harus diisi' })

  try {
    const duplicateQuery = 'SELECT * FROM user WHERE username = ?'
    const [duplicateResult] = await pool
      .promise()
      .query(duplicateQuery, [username])

    if (duplicateResult.length > 0) {
      return res.status(409).json({ message: 'Username duplicated' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const insertQuery = 'INSERT INTO user (username, password) VALUES ( ?, ?)'
    await pool.promise().query(insertQuery, [username, hashedPassword])

    res.status(201).json({ message: 'User created successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' })
  }
}

const SignIn = async (req, res) => {
  const { username, password } = req.body

  if (!username || !password)
    return res.status(400).json({ message: 'Nama dan password harus diisi' })

  try {
    const userQuery = 'SELECT * FROM user WHERE username = ?'
    const [userResult] = await pool.promise().query(userQuery, [username])

    if (userResult.length === 0) {
      return res
        .status(401)
        .json({ message: 'Nama atau password ada yang salah' })
    }

    const foundUser = userResult[0]

    const match = await bcrypt.compare(password, foundUser.password)

    if (match) {
      // Create JWTs
      const token = jwt.sign(
        { userId: foundUser.id_user, username: foundUser.username },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '1d' }
      )

      res
        .status(200)
        .json({ message: 'User is authorized', token: token, status: true })
    } else {
      res.status(401).json({ message: 'Nama atau password ada yang salah' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' })
  }
}

const getUserIdFromToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null // or throw an error, depending on your error handling strategy
  }

  const token = authorizationHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
    return decoded.userId // Assuming you included userId in the token payload during sign-in
  } catch (error) {
    // Token verification failed
    console.error(error)
    return null // or throw an error, depending on your error handling strategy
  }
}

module.exports = { SignIn, SignUp, getUserIdFromToken }
