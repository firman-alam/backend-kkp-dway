const express = require('express')
const Criteria = require('../controllers/criteriaController')

const router = express.Router()

router
  .route('/')
  .get(Criteria.getAllCriterias)
  .post(Criteria.addCriteria)
  .patch(Criteria.updateCriteria)

router.route('/:id').get(Criteria.getCriteria).delete(Criteria.deleteCriteria)

module.exports = router
