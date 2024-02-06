const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const pool = require('../config/dbConfig')

const SignUp = async (req, res) => {
  const { username, password } = req.body

  if (!username || !password)
    return res.status(400).json({ message: 'Semua field harus diisi' })

  try {
    // Check if the username already exists in the users table
    const duplicateQuery = 'SELECT * FROM user WHERE username = ?'
    const [duplicateResult] = await pool
      .promise()
      .query(duplicateQuery, [username])

    if (duplicateResult.length > 0) {
      // If the username already exists, return a conflict response
      return res.sendStatus(409)
    }

    // If the username is not found, proceed to create a new user
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert the new user into the users table
    const insertQuery = 'INSERT INTO user (username, password) VALUES ( ?, ?)'
    await pool.promise().query(insertQuery, [username, hashedPassword])

    // Return a success response
    res.status(201).json({ message: 'User created successfully' })
  } catch (error) {
    // Handle any errors that occur during the process
    console.error(error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
}

const SignIn = async (req, res) => {
  const { username, password } = req.body

  if (!username || !password)
    return res.status(400).json({ message: 'Nama dan password harus diisi' })

  try {
    // Check if the user exists in the database
    const userQuery = 'SELECT * FROM user WHERE username = ?'
    const [userResult] = await pool.promise().query(userQuery, [username])

    if (userResult.length === 0) {
      return res
        .status(401)
        .json({ message: 'Nama atau password ada yang salah' })
    }

    const foundUser = userResult[0]

    // Evaluate password
    const match = await bcrypt.compare(password, foundUser.password)

    if (match) {
      // Create JWTs
      const accessToken = jwt.sign(
        { userId: foundUser.id_user, username: foundUser.username },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1d' }
      )

      const refreshToken = jwt.sign(
        { userId: foundUser.id_user, username: foundUser.username },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '1d' }
      )

      // Update the refreshToken in the database
      const updateRefreshTokenQuery =
        'UPDATE user SET refresh_token = ? WHERE username = ?'
      await pool
        .promise()
        .query(updateRefreshTokenQuery, [refreshToken, foundUser.username])

      res.cookie('jwt', refreshToken, {
        httpOnly: true,
        sameSite: 'None',
        secure: true,
        maxAge: 24 * 60 * 60 * 1000,
      })
      res.json({ accessToken })
    } else {
      res.status(401).json({ message: 'Nama atau password ada yang salah' }) // Unauthorized
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
}

const RefreshToken = async (req, res) => {
  const cookies = req.cookies
  if (!cookies?.jwt) return res.sendStatus(401)
  const refreshToken = cookies.jwt

  try {
    // Check if the refreshToken exists in the database
    const userQuery = 'SELECT * FROM user WHERE refresh_token = $1'
    const userResult = await pool.query(userQuery, [refreshToken])

    if (userResult.rows.length === 0) {
      return res.sendStatus(403) // Forbidden
    }

    const foundUser = userResult.rows[0]

    // Verify the refreshToken and decode the username
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, decoded) => {
        if (err || foundUser.username !== decoded.username) {
          return res.sendStatus(403)
        }

        // Create a new accessToken
        const accessToken = jwt.sign(
          { username: decoded.username },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '30s' }
        )

        res.json({ accessToken })
      }
    )
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
}

const SignOut = async (req, res) => {
  const cookies = req.cookies
  if (!cookies?.jwt) return res.sendStatus(204) // No content

  const refreshToken = cookies.jwt

  try {
    // Check if the refreshToken exists in the database
    const userQuery = 'SELECT * FROM user WHERE refresh_token = ?'
    const [userResult] = await pool.promise().query(userQuery, [refreshToken])

    if (userResult.length === 0) {
      // If refreshToken is not in the database, clear the cookie and return 204
      res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true })
      return res.sendStatus(204)
    }

    // Update the refresh_token field to NULL (or an empty string) in the database
    const updateRefreshTokenQuery =
      'UPDATE user SET refresh_token = NULL WHERE refresh_token = ?'
    await pool.promise().query(updateRefreshTokenQuery, [refreshToken])

    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true })
    res.sendStatus(204)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
}

const getUserIdFromToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null // or throw an error, depending on your error handling strategy
  }

  const token = authorizationHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    return decoded.userId // Assuming you included userId in the token payload during sign-in
  } catch (error) {
    // Token verification failed
    console.error(error)
    return null // or throw an error, depending on your error handling strategy
  }
}

module.exports = { SignIn, SignOut, SignUp, RefreshToken, getUserIdFromToken }
