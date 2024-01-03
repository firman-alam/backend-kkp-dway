import express from 'express'
import { GetMatrixs } from "../controllers/matrixController.js"

const router = express.Router()

router.post("/", GetMatrixs)

export default router
