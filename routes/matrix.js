import express from 'express'
import Matrix from '../controllers/matrixController'

const router = express.Router()

router.post('/', Matrix.GetMatrixs)

module.exports = router
