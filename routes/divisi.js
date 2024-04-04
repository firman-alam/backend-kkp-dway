const express = require('express')
const Divisi = require('../controllers/divisiController')
const Kriteria = require('../controllers/criteriaController')
const Kandidat = require('../controllers/employeeController')
const Matrix = require('../controllers/matrixController')

const router = express.Router()

router
  .route('/')
  .get(Divisi.getAllDivisi)
  .post(Divisi.addDivisi)
  .patch(Divisi.updateDivisi)
router.route('/:id').get(Divisi.getDivisi).delete(Divisi.deleteDivisi)

// Kriteria
router
  .route('/:id/kriteria')
  .get(Kriteria.getAllCriterias)
  .post(Kriteria.addCriteria)
router
  .route('/:id/kriteria/:id_kriteria')
  .get(Kriteria.getCriteria)
  .patch(Kriteria.updateCriteria)
  .delete(Kriteria.deleteCriteria)

// Kandidat
router
  .route('/:id/kandidat')
  .get(Kandidat.getAllEmployees)
  .post(Kandidat.addEmployee)
router
  .route('/:id/kandidat/:id_kandidat')
  .get(Kandidat.getEmployee)
  .patch(Kandidat.updateEmployee)
  .delete(Kandidat.deleteEmployee)

router.route('/:id/nilai').get(Matrix.GetAllNilai)

router
  .route('/:id/kandidat/:id_kandidat/nilai')
  .get(Matrix.GetNilai)
  .post(Matrix.AddNilai)
  .patch(Matrix.EditNilai)
  .delete(Matrix.DeleteNilai)

module.exports = router
