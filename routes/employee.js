import express from 'express'
import {
  addEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
} from "../controllers/employeeController.js"

const router = express.Router()

router
  .route("/")
  .get(getAllEmployees)
  .post(addEmployee)
  .put(updateEmployee)
  .delete(deleteEmployee)

router.route("/:id").get(getEmployee)

export default router
