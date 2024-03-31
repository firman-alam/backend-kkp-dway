const express = require('express')
const Divisi = require('../controllers/divisiController')
const Kriteria = require('../controllers/criteriaController')
const Kandidat = require('../controllers/employeeController')
const Matrix = require('../controllers/matrixController')

const router = express.Router()

router.route('/').get(Divisi.getAllDivisi).post(Divisi.addDivisi)
router
  .route('/:id')
  .get(Divisi.getDivisi)
  .patch(Divisi.updateDivisi)
  .delete(Divisi.deleteDivisi)

router
  .route('/:id/kriteria')
  .get(Kriteria.getAllCriterias)
  .post(Kriteria.addCriteria)
router
  .route('/:id/kriteria/:id_kriteria')
  .get(Kriteria.getCriteria)
  .patch(Kriteria.updateCriteria)
  .delete(Kriteria.deleteCriteria)

router
  .route('/:id/kandidat')
  .get(Kandidat.getAllEmployees)
  .post(Kandidat.addEmployee)
router
  .route('/:id/kandidat/:id_kandidat')
  .get(Kandidat.getEmployee)
  .patch(Kandidat.updateEmployee)
  .delete(Kandidat.deleteEmployee)
  .post(Matrix.AddNilai)

module.exports = router
