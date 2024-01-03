import express from 'express'
import { GetData } from "../controllers/dataController.js"

const router = express.Router()

router.post("/", GetData)

export default router
