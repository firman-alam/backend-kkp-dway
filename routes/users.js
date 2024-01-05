const express = require('express')
const User = require('../controllers/userController')

const router = express.Router()

router.post('/sign-up', User.SignUp)
router.post('/sign-in', User.SignIn)
router.post('/sign-out', User.SignOut)

module.exports = router
