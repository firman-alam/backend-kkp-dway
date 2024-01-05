const pool = require("../config/dbConfig")

const getAllCriterias = (req, res) => {
  try {
    const [rows] = pool.query("SELECT * FROM kriteria")
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).send("Internal Server Error")
  }
}

const getCriteria = (req, res) => {
  const criteriaId = req.params.id

  try {
    const [rows] = pool.query("SELECT * FROM kriteria WHERE id_kriteria = ?", [
      criteriaId,
    ])
    if (rows.length > 0) {
      res.json(rows[0])
    } else {
      res.status(404).send("Criteria not found")
    }
  } catch (error) {
    console.error(error)
    res.status(500).send("Internal Server Error")
  }
}

const addCriteria = (req, res) => {
  const { nama, bobot, kode, tipe } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [result] = pool.query(
      "INSERT INTO kriteria (nama, bobot, kode, tipe, created_by) VALUES (?, ?, ?, ?, ?)",
      [nama, bobot, kode, tipe, userId]
    )

    const insertedId = result.insertId
    res.json({
      id_kriteria: insertedId,
      message: "Criteria added successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).send("Internal Server Error")
  }
}

const updateCriteria = async (req, res) => {
  const criteriaId = req.params.id
  const { nama, bobot, kode, tipe } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [result] = pool.query(
      "UPDATE kriteria SET nama = ?, bobot = ?, kode = ?, tipe = ?, last_modified_by = ? WHERE id_kriteria = ?",
      [nama, bobot, kode, tipe, userId, criteriaId]
    )

    if (result.affectedRows > 0) {
      res.send("Criteria updated successfully")
    } else {
      res.status(404).send("Criteria not found")
    }
  } catch (error) {
    console.error(error)
    res.status(500).send("Internal Server Error")
  }
}

const deleteCriteria = async (req, res) => {
  const criteriaId = req.params.id
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    const [result] = pool.query(
      "DELETE FROM kriteria WHERE id_kriteria = ? AND last_modified_by = ?",
      [criteriaId, userId]
    )

    if (result.affectedRows > 0) {
      res.send("Criteria deleted successfully")
    } else {
      res.status(404).send("Criteria not found")
    }
  } catch (error) {
    console.error(error)
    res.status(500).send("Internal Server Error")
  }
}

export {
  getAllCriterias,
  getCriteria,
  addCriteria,
  updateCriteria,
  deleteCriteria,
}
