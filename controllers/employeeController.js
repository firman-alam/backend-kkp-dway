const pool = require('../config/dbConfig')
const { getUserIdFromToken } = require('./userController')

const getAllEmployees = async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [rows] = await pool
      .promise()
      .query('SELECT * FROM pegawai WHERE created_by = ?', [userId])
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const getEmployee = async (req, res) => {
  const employeeId = req.params.id
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [rows] = await pool
      .promise()
      .query('SELECT * FROM pegawai WHERE id_pegawai = ? AND created_by = ?', [
        employeeId,
        userId,
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

const addEmployee = async (req, res) => {
  const { nama, nik, divisi, no_telepon, alamat } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [existingEmployee] = await pool
      .promise()
      .query('SELECT * FROM pegawai WHERE nik = ?', [nik])

    if (existingEmployee.length > 0) {
      return res
        .status(400)
        .json({ message: 'Pegawai dengan NIK yang sama sudah ada' })
    }

    const [result] = await pool
      .promise()
      .query(
        'INSERT INTO pegawai (nama, nik, divisi, no_telepon, alamat, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [nama, nik, divisi, no_telepon, alamat, userId]
      )

    const insertedId = result.insertId
    res.json({ id_pegawai: insertedId, message: 'Employee added successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const updateEmployee = async (req, res) => {
  const { id_pegawai, nama, nik, divisi, no_telepon } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [existingEmployee] = await pool
      .promise()
      .query('SELECT * FROM pegawai WHERE nik = ? AND id_pegawai <> ?', [
        nik,
        id_pegawai,
      ])

    if (existingEmployee.length > 0) {
      // Employee with the same nik already exists
      return res
        .status(400)
        .json({ message: 'Pegawai dengan NIK yang sama sudah ada' })
    }

    const [result] = await pool
      .promise()
      .query(
        'UPDATE pegawai SET nama = ?, nik = ?, divisi = ?, no_telepon = ?, last_modified_by = ? WHERE id_pegawai = ?',
        [nama, nik, divisi, no_telepon, userId, id_pegawai]
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

const deleteEmployee = async (req, res) => {
  const employeeId = req.params.id
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [result] = await pool
      .promise()
      .query('DELETE FROM pegawai WHERE id_pegawai = ? AND created_by = ?', [
        employeeId,
        userId,
      ])

    if (result.affectedRows > 0) {
      res.status(200).send('Employee deleted successfully')
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
