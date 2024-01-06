const express = require('express')
const Employee = require('../controllers/employeeController')

const router = express.Router()

router
  .route('/')
  .get(Employee.getAllEmployees)
  .post(Employee.addEmployee)
  .put(Employee.updateEmployee)
  .delete(Employee.deleteEmployee)

router.route('/:id').get(Employee.getEmployee)

module.exports = router
