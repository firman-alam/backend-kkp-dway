const express = require('express')
const Data = require('../controllers/dataController')

const router = express.Router()

router.post('/', Data.GetData)

module.exports = router
