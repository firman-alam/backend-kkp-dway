const express = require('express')
const Employee = require('../controllers/employeeController')

const router = express.Router()

router
  .route('/')
  .get(Employee.getAllEmployees)
  .post(Employee.addEmployee)
  .patch(Employee.updateEmployee)

router.route('/:id').get(Employee.getEmployee).delete(Employee.deleteEmployee)

module.exports = router
