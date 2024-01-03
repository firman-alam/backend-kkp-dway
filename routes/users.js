import express from 'express'
import { SignIn, SignOut, SignUp } from "../controllers/userController.js"

const router = express.Router()

router.post("/sign-up", SignUp)
router.post("/sign-in", SignIn)
router.post("/sign-out", SignOut)

export default router
