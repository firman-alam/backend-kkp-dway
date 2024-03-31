const pool = require('../config/dbConfig')
const { getUserIdFromToken } = require('./userController')

const getAllCriterias = async (req, res) => {
  const id_divisi = req.params.id
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [rows] = await pool
      .promise()
      .query('SELECT * FROM kriteria WHERE id_divisi = ? AND created_by = ?', [
        id_divisi,
        userId,
      ])
    if (rows.length > 0) {
      res.status(200).json({ data: rows })
    } else {
      res.status(404).json({ message: 'Kriteria tidak ditemukan' })
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const getCriteria = async (req, res) => {
  const id_divisi = req.params.id
  const id_kriteria = req.params.id_kriteria
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [rows] = await pool
      .promise()
      .query(
        'SELECT * FROM kriteria WHERE id_kriteria = ? AND created_by = ? AND id_divisi = ?',
        [id_kriteria, userId, id_divisi]
      )

    if (rows.length > 0) {
      res.status(200).send(rows[0])
    } else {
      res.status(404).send('Criteria not found')
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const addCriteria = async (req, res) => {
  const id_divisi = req.params.id
  const { nama, bobot, kode, tipe } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [existingCriteria] = await pool
      .promise()
      .query('SELECT * FROM kriteria WHERE kode = ? AND created_by = ?', [
        kode,
        userId,
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
        'INSERT INTO kriteria (id_divisi, nama, bobot, kode, tipe, created_by, created_date) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [id_divisi, nama, bobot, kode, tipe, userId]
      )

    const insertedId = result.insertId
    res.json({
      id_kriteria: insertedId,
      message: 'Kriteria berhasil ditambahkan',
    })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const updateCriteria = async (req, res) => {
  const { id_kriteria, id_divisi, nama, bobot, kode, tipe } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [existingCriteria] = await pool
      .promise()
      .query(
        'SELECT * FROM kriteria WHERE kode = ? AND id_kriteria <> ? AND id_divisi = ? AND created_by = ?',
        [kode, id_kriteria, id_divisi, userId]
      )

    if (existingCriteria.length > 0) {
      // Criteria with the same code already exists
      return res
        .status(400)
        .json({ message: 'Kriteria dengan kode yang sama sudah ada' })
    }

    const [result] = await pool
      .promise()
      .query(
        'UPDATE kriteria SET nama = ?, bobot = ?, kode = ?, tipe = ?, last_modified_by = ?, last_modified_date = NOW() WHERE id_kriteria = ? AND id_divisi = ? AND created_by = ?',
        [nama, bobot, kode, tipe, userId, id_kriteria, id_divisi, userId]
      )

    if (result.affectedRows > 0) {
      res.status(201).json({ message: 'Kriteria berhasil diperbarui' })
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
