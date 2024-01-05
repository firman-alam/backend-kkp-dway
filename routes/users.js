const express = require('express')
const User = require('../controllers/userController')

const router = express.Router()

router.post("/sign-up", SignUp)
router.post("/sign-in", SignIn)
router.post("/sign-out", SignOut)

export default router
