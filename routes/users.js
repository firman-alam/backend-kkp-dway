const express = require("express");
const User = require("../controllers/userController");
const checkAdmin = require("../middleware/checkAdmin");

const router = express.Router();

router.post("/sign-up", checkAdmin, User.SignUp);
router.post("/sign-in", User.SignIn);

module.exports = router;
