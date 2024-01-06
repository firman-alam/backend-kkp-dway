const express = require('express')
const Criteria = require('../controllers/criteriaController')

const router = express.Router()

router
  .route('/')
  .get(Criteria.getAllCriterias)
  .post(Criteria.addCriteria)
  .put(Criteria.updateCriteria)
  .delete(Criteria.deleteCriteria)

router.route('/:id').get(Criteria.getCriteria)

module.exports = router
