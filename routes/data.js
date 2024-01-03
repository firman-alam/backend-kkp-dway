import express from 'express'
import Data from '../controllers/dataController'

const router = express.Router()

router.post('/', Data.GetData)

module.exports = router
