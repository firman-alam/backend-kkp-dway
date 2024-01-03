import express from 'express'
import Criteria from '../controllers/criteriaController'

const router = express.Router()

router
  .route('/')
  .get(Criteria.getAllCriterias)
  .post(Criteria.addCriteria)
  .put(Criteria.updateCriteria)
  .delete(Criteria.deleteCriteria)

router.route('/:id').get(Criteria.getCriteria)

module.exports = router
