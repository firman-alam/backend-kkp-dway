const express = require('express')
const Matrix = require('../controllers/matrixController')

const router = express.Router()

router.post("/", GetMatrixs)

export default router
