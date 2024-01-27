const pool = require('../config/dbConfig')
const { getUserIdFromToken } = require('./userController')

const getAllCriterias = async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [rows] = await pool
      .promise()
      .query('SELECT * FROM kriteria WHERE created_by = ?', [userId])
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const getCriteria = async (req, res) => {
  const criteriaId = req.params.id
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [rows] = await pool
      .promise()
      .query(
        'SELECT * FROM kriteria WHERE id_kriteria = ? AND created_by = ?',
        [criteriaId, userId]
      )

    if (rows.length > 0) {
      res.json(rows[0])
    } else {
      res.status(404).send('Criteria not found')
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const addCriteria = async (req, res) => {
  const { nama, bobot, code, tipe } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [existingCriteria] = await pool
      .promise()
      .query('SELECT * FROM kriteria WHERE code = ? AND created_by = ?', [code, userId])

    if (existingCriteria.length > 0) {
      // Criteria with the same code already exists
      return res
        .status(400)
        .json({ message: 'Kriteria dengan kode yang sama sudah ada' })
    }

    const [result] = await pool
      .promise()
      .query(
        'INSERT INTO kriteria (nama, bobot, code, tipe, created_by, created_date) VALUES (?, ?, ?, ?, ?, NOW())',
        [nama, bobot, code, tipe, userId]
      )

    const insertedId = result.insertId
    res.json({
      id_kriteria: insertedId,
      message: 'Criteria added successfully',
    })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const updateCriteria = async (req, res) => {
  const { id_kriteria, nama, bobot, code, tipe } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [existingCriteria] = await pool
      .promise()
      .query('SELECT * FROM kriteria WHERE code = ? AND id_kriteria <> ? AND created_by = ?', [
        code,
        id_kriteria,
        userId
      ])

    if (existingCriteria.length > 0) {
      // Criteria with the same code already exists
      return res
        .status(400)
        .json({ message: 'Kriteria dengan kode yang sama sudah ada' })
    }

    const [result] = await pool
      .promise()
      .query(
        'UPDATE kriteria SET nama = ?, bobot = ?, code = ?, tipe = ?, last_modified_by = ?, last_modified_date = NOW() WHERE id_kriteria = ?',
        [nama, bobot, code, tipe, userId, id_kriteria]
      )

    if (result.affectedRows > 0) {
      res.send('Criteria updated successfully')
    } else {
      res.status(404).send('Criteria not found')
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const deleteCriteria = async (req, res) => {
  const criteriaId = req.params.id
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [result] = await pool
      .promise()
      .query('DELETE FROM kriteria WHERE id_kriteria = ?', [criteriaId, userId])

    if (result.affectedRows > 0) {
      res.send('Criteria deleted successfully')
    } else {
      res.status(404).send('Criteria not found')
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

module.exports = {
  getAllCriterias,
  getCriteria,
  addCriteria,
  updateCriteria,
  deleteCriteria,
}
