import express from 'express'
import {
  addCriteria,
  deleteCriteria,
  getAllCriterias,
  getCriteria,
  updateCriteria,
} from "../controllers/criteriaController.js"

const router = express.Router()

router
  .route("/")
  .get(getAllCriterias)
  .post(addCriteria)
  .put(updateCriteria)
  .delete(deleteCriteria)

router.route("/:id").get(getCriteria)

export default router
