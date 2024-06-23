const pool = require("../config/dbConfig");
const { getUserIdFromToken } = require("./userController");

const getAllEmployees = async (req, res) => {
  const id_divisi = req.params.id;
  const userId = getUserIdFromToken(req.headers.authorization);

  try {
    const [rows] = await pool
      .promise()
      .query("SELECT * FROM kandidat WHERE id_divisi = ? AND created_by = ?", [
        id_divisi,
        userId,
      ]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const getEmployee = async (req, res) => {
  const id_divisi = req.params.id;
  const id_kandidat = req.params.id_kandidat;
  const userId = getUserIdFromToken(req.headers.authorization);

  try {
    const [rows] = await pool
      .promise()
      .query(
        "SELECT * FROM kandidat WHERE id_kandidat = ? AND id_divisi = ? AND created_by = ?",
        [id_kandidat, id_divisi, userId]
      );

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).send("Employee not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const addEmployee = async (req, res) => {
  const id_divisi = req.params.id;
  const { nama, nik, no_telepon, alamat, gender } = req.body;
  const userId = getUserIdFromToken(req.headers.authorization);

  try {
    const [existingEmployee] = await pool
      .promise()
      .query(
        "SELECT * FROM kandidat WHERE nik = ? AND id_divisi = ? AND created_by = ?",
        [nik, id_divisi, userId]
      );

    if (existingEmployee.length > 0) {
      return res.status(400).json({
        message: "Kandidat dengan NIK yang sama sudah ada",
        status: false,
      });
    }

    const [result] = await pool
      .promise()
      .query(
        "INSERT INTO kandidat (nama, nik, id_divisi, no_telepon, alamat, gender, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [nama, nik, id_divisi, no_telepon, alamat, gender, userId]
      );

    const insertedId = result.insertId;
    res.json({
      id_kandidat: insertedId,
      message: "Kandidat berhasil ditambahkan",
      status: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const updateEmployee = async (req, res) => {
  const id_divisi = req.params.id;
  const id_kandidat = req.params.id_kandidat;
  const { nama, nik, gender, alamat, no_telepon } = req.body;
  const userId = getUserIdFromToken(req.headers.authorization);

  try {
    const [existingEmployee] = await pool
      .promise()
      .query(
        "SELECT * FROM kandidat WHERE nik = ? AND id_kandidat <> ? AND created_by = ?",
        [nik, id_kandidat, userId]
      );

    if (existingEmployee.length > 0) {
      return res.status(400).json({
        message: "Pegawai dengan NIK yang sama sudah ada",
        status: false,
      });
    }

    const [result] = await pool
      .promise()
      .query(
        "UPDATE kandidat SET nama = ?, nik = ?, id_divisi = ?, no_telepon = ?, alamat = ?, gender = ?, last_modified_by = ? WHERE id_kandidat = ? AND created_by = ?",
        [
          nama,
          nik,
          id_divisi,
          no_telepon,
          alamat,
          gender,
          userId,
          id_kandidat,
          userId,
        ]
      );

    if (result.affectedRows > 0) {
      res
        .status(201)
        .json({ message: "Data berhasil diperbarui", status: true });
    } else {
      res
        .status(404)
        .json({ message: "Kandidat tidak ditemukan", status: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteEmployee = async (req, res) => {
  const id_divisi = req.params.id;
  const id_kandidat = req.params.id_kandidat;
  const userId = getUserIdFromToken(req.headers.authorization);

  const connection = await pool.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      "DELETE FROM kandidat WHERE id_kandidat = ? AND created_by = ? AND id_divisi = ?",
      [id_kandidat, userId, id_divisi]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      res
        .status(404)
        .json({ status: false, message: "Kandidat tidak ditemukan" });
      return;
    }

    await Promise.all([
      connection.query(
        "DELETE FROM data_penilaian_header WHERE id_kandidat = ? AND created_by = ? AND id_divisi = ?",
        [id_kandidat, userId, id_divisi]
      ),
      connection.query(
        "DELETE FROM data_penilaian_detail WHERE id_kandidat = ? AND created_by = ? AND id_divisi = ?",
        [id_kandidat, userId, id_divisi]
      ),
      connection.query(
        "DELETE FROM matriks_penilaian_header WHERE id_kandidat = ? AND created_by = ? AND id_divisi = ?",
        [id_kandidat, userId, id_divisi]
      ),
      connection.query(
        "DELETE FROM matriks_penilaian_detail WHERE id_kandidat = ? AND created_by = ? AND id_divisi = ?",
        [id_kandidat, userId, id_divisi]
      ),
    ]);

    await connection.commit();
    res
      .status(200)
      .json({ status: true, message: "Kandidat berhasil dihapus" });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send("Internal Server Error");
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllEmployees,
  getEmployee,
  addEmployee,
  updateEmployee,
  deleteEmployee,
};
