const pool = require("../config/dbConfig");
const { getUserIdFromToken } = require("./userController");

const getAllDivisi = async (req, res) => {
  const userId = getUserIdFromToken(req.headers.authorization);
  const { search } = req.query;
  let query = "SELECT * FROM divisi WHERE created_by = ?";

  const queryParams = [userId];

  if (search && search.trim() !== "") {
    query += " AND nama_divisi LIKE ?";
    queryParams.push(`%${search}%`);
  }

  try {
    const [rows] = await pool.promise().query(query, queryParams);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const getDivisi = async (req, res) => {
  const criteriaId = req.params.id;
  const userId = getUserIdFromToken(req.headers.authorization);

  try {
    const [rows] = await pool
      .promise()
      .query("SELECT * FROM divisi WHERE id_divisi = ? AND created_by = ?", [
        criteriaId,
        userId,
      ]);

    if (rows.length > 0) {
      res
        .status(200)
        .json({ message: "Data didapat", data: rows[0], status: true });
    } else {
      res.status(404).send("Divisi not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const addDivisi = async (req, res) => {
  const { nama_divisi } = req.body;
  const userId = getUserIdFromToken(req.headers.authorization);

  try {
    const [existingDivisi] = await pool
      .promise()
      .query("SELECT * FROM divisi WHERE nama_divisi = ? AND created_by = ?", [
        nama_divisi,
        userId,
      ]);

    if (existingDivisi.length > 0) {
      return res.status(400).json({
        message: "Divisi dengan nama yang sama sudah ada",
        status: false,
      });
    }

    const [result] = await pool
      .promise()
      .query(
        "INSERT INTO divisi (nama_divisi, created_by, created_date) VALUES ( ?, ?, NOW())",
        [nama_divisi, userId]
      );

    const insertedId = result.insertId;
    res.json({
      id_divisi: insertedId,
      message: "Divisi telah ditambahkan",
      status: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const updateDivisi = async (req, res) => {
  const { id_divisi, nama_divisi } = req.body;
  const userId = getUserIdFromToken(req.headers.authorization);

  try {
    const [existingDivisi] = await pool
      .promise()
      .query(
        "SELECT * FROM divisi WHERE nama_divisi = ? AND id_divisi <> ? AND created_by = ?",
        [nama_divisi, id_divisi, userId]
      );

    if (existingDivisi.length > 0) {
      // Criteria with the same code already exists
      return res.status(400).json({
        message: "Divisi dengan nama yang sama sudah ada",
        status: false,
      });
    }

    const [result] = await pool
      .promise()
      .query(
        "UPDATE divisi SET nama_divisi = ?, last_modified_by = ?, last_modified_date = NOW() WHERE id_divisi = ?",
        [nama_divisi, userId, id_divisi]
      );

    if (result.affectedRows > 0) {
      res
        .status(200)
        .json({ message: "Divisi berhasil diperbarui", status: true });
    } else {
      res.status(404).json({ message: "Divisi not found", status: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteDivisi = async (req, res) => {
  const id_divisi = req.params.id;
  const userId = getUserIdFromToken(req.headers.authorization);

  const connection = await pool.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      "DELETE FROM divisi WHERE id_divisi = ? AND created_by = ?",
      [id_divisi, userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      res.status(404).json({ message: "Divisi not found", status: false });
      return;
    }

    await Promise.all([
      connection.query(
        "DELETE FROM kandidat WHERE created_by = ? AND id_divisi = ?",
        [userId, id_divisi]
      ),
      connection.query(
        "DELETE FROM kriteria WHERE created_by = ? AND id_divisi = ?",
        [userId, id_divisi]
      ),
      connection.query(
        "DELETE FROM data_penilaian_header WHERE created_by = ? AND id_divisi = ?",
        [userId, id_divisi]
      ),
      connection.query(
        "DELETE FROM data_penilaian_detail WHERE created_by = ? AND id_divisi = ?",
        [userId, id_divisi]
      ),
      connection.query(
        "DELETE FROM matriks_penilaian_header WHERE created_by = ? AND id_divisi = ?",
        [userId, id_divisi]
      ),
      connection.query(
        "DELETE FROM matriks_penilaian_detail WHERE created_by = ? AND id_divisi = ?",
        [userId, id_divisi]
      ),
    ]);

    await connection.commit();
    res.status(200).json({ message: "Divisi berhasil dihapus", status: true });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send("Internal Server Error");
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllDivisi,
  getDivisi,
  addDivisi,
  updateDivisi,
  deleteDivisi,
};
