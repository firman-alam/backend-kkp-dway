import express from 'express'
import Employee from '../controllers/employeeController'

const router = express.Router()

router
  .route('/')
  .get(Employee.getAllEmployees)
  .post(Employee.addEmployee)
  .put(Employee.updateEmployee)
  .delete(Employee.deleteEmployee)

router.route('/:id').get(Employee.getEmployee)

module.exports = router
