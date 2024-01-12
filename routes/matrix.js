const express = require('express')
const Matrix = require('../controllers/matrixController')

const router = express.Router()

router.get('/', Matrix.GetMatrixs)

router
  .route('/nilai')
  .get(Matrix.GetAllNilai)
  .post(Matrix.AddNilai)
  .patch(Matrix.EditNilai)

router.route('/nilai/:id').get(Matrix.GetNilai).delete(Matrix.DeleteNilai)

router.route("/rank").get(Matrix.GetRanks)

module.exports = router
