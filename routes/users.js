const express = require("express");
const User = require("../controllers/userController");
const checkAdmin = require("../middleware/checkAdmin");

const router = express.Router();

router.post("/sign-up", checkAdmin, User.SignUp);
router.post("/sign-in", User.SignIn);

router.get("/", User.getAllUsers);
router.get("/:user_id", User.getUserById);
router.post("/", User.addUser);
router.put("/:user_id", User.updateUser);
router.delete("/:user_id", User.deleteUser);

module.exports = router;
