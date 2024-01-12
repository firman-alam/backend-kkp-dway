const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
dotenv.config()

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers['authorization']

  if (!authHeader) {
    console.log('Authorization header missing')
    return res.sendStatus(401)
  }

  const token = authHeader.split(' ')[1]

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log('Token verification failed:', err)
      return res.sendStatus(403)
    }

    console.log('Token verified successfully:', decoded)
    req.user = decoded
    next()
  })
}

module.exports = verifyJWT
