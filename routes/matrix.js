const express = require('express')
const Matrix = require('../controllers/matrixController')

const router = express.Router()

router.post('/', Matrix.GetMatrixs)

router.route("/ranks").get(Matrix.GetRanks)

module.exports = router
