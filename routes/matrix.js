const express = require('express')
const Matrix = require('../controllers/matrixController')

const router = express.Router()

router
  .route('/nilai')
  .get(Matrix.GetAllNilai)
  .post(Matrix.AddNilai)
  .put(Matrix.EditNilai)

router.route('/nilai/:id').get(Matrix.GetNilai).delete(Matrix.DeleteNilai)

router.route("/ranks").get(Matrix.GetRanks)

module.exports = router
