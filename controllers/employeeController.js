const pool = require('../config/dbConfig')

const getAllEmployees = (req, res) => {
  try {
    const [rows] = pool.query('SELECT * FROM pegawai')
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const getEmployee = (req, res) => {
  const employeeId = req.params.id
  
  try {
    const [rows] = pool.query('SELECT * FROM pegawai WHERE id_pegawai = ?', [
      employeeId,
    ])
    if (rows.length > 0) {
      res.json(rows[0])
    } else {
      res.status(404).send('Employee not found')
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const addEmployee = (req, res) => {
  const { nama, nik, divisi, no_telepon } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [result] = pool.query(
      'INSERT INTO pegawai (nama, nik, divisi, no_telepon, created_by) VALUES (?, ?, ?, ?, ?)',
      [nama, nik, divisi, no_telepon, userId]
    )

    const insertedId = result.insertId
    res.json({ id_pegawai: insertedId, message: 'Employee added successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const updateEmployee = (req, res) => {
  const employeeId = req.params.id
  const { nama, nik, divisi, no_telepon } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [result] = pool.query(
      'UPDATE pegawai SET nama = ?, nik = ?, divisi = ?, no_telepon = ?, last_modified_by = ? WHERE id_pegawai = ?',
      [nama, nik, divisi, no_telepon, userId, employeeId]
    )

    if (result.affectedRows > 0) {
      res.send('Employee updated successfully')
    } else {
      res.status(404).send('Employee not found')
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const deleteEmployee = (req, res) => {
  const employeeId = req.params.id
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [result] = pool.query(
      'DELETE FROM pegawai WHERE id_pegawai = ? AND last_modified_by = ?',
      [employeeId, userId]
    )

    if (result.affectedRows > 0) {
      res.send('Employee deleted successfully')
    } else {
      res.status(404).send('Employee not found')
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

module.exports = {
  getAllEmployees,
  getEmployee,
  addEmployee,
  updateEmployee,
  deleteEmployee,
}
