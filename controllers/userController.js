const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("../config/dbConfig");

const SignUp = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: "Semua field harus diisi" });

  try {
    const duplicateQuery = "SELECT * FROM user WHERE username = ?";
    const [duplicateResult] = await pool
      .promise()
      .query(duplicateQuery, [username]);

    if (duplicateResult.length > 0) {
      return res
        .status(409)
        .json({ message: "Terdapat username yang sama, ganti username lain" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = "INSERT INTO user (username, password) VALUES ( ?, ?)";
    await pool.promise().query(insertQuery, [username, hashedPassword]);

    res.status(201).json({ message: "User berhasil ditambahkan" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const SignIn = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: "Nama dan password harus diisi" });

  try {
    const userQuery = "SELECT * FROM user WHERE username = ?";
    const [userResult] = await pool.promise().query(userQuery, [username]);

    if (userResult.length === 0) {
      return res
        .status(401)
        .json({ message: "Nama atau password ada yang salah", status: false });
    }

    const foundUser = userResult[0];

    const match = await bcrypt.compare(password, foundUser.password);

    if (match) {
      // Create JWTs
      const token = jwt.sign(
        {
          userId: foundUser.id_user,
          username: foundUser.username,
          role: foundUser.role,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1d" }
      );

      res.status(200).json({
        message: `Selamat datang ${foundUser.username}`,
        token: token,
        status: true,
      });
    } else {
      res
        .status(401)
        .json({ message: "Nama atau password ada yang salah", status: false });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getUserIdFromToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null; // or throw an error, depending on your error handling strategy
  }

  const token = authorizationHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    return decoded.userId; // Assuming you included userId in the token payload during sign-in
  } catch (error) {
    // Token verification failed
    console.error(error);
    return null; // or throw an error, depending on your error handling strategy
  }
};

const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.promise().query("SELECT * FROM user");
    if (rows.length > 0) {
      res.status(200).json({ data: rows });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const getUserById = async (req, res) => {
  const user_id = req.params.user_id;

  try {
    const [rows] = await pool
      .promise()
      .query("SELECT * FROM user WHERE id_user = ?", [user_id]);
    if (rows.length > 0) {
      res.status(200).json({ data: rows[0] });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const addUser = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const [result] = await pool
      .promise()
      .query("INSERT INTO user (username, password, role) VALUES (?, ?, ?)", [
        username,
        password,
        role,
      ]);
    if (result.affectedRows > 0) {
      res
        .status(201)
        .json({ message: "User added successfully", userId: result.insertId });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const updateUser = async (req, res) => {
  const user_id = req.params.user_id;
  const { username, password, role } = req.body;

  try {
    const [result] = await pool
      .promise()
      .query(
        "UPDATE user SET username = ?, password = ?, role = ? WHERE id_user = ?",
        [username, password, role, user_id]
      );
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "User updated successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const deleteUser = async (req, res) => {
  const user_id = req.params.user_id;

  try {
    const [result] = await pool
      .promise()
      .query("DELETE FROM user WHERE id_user = ?", [user_id]);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "User deleted successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  SignIn,
  SignUp,
  getUserIdFromToken,
  getAllUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
};
