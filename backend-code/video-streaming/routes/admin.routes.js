const upload = require("../utils/multer");
const { AdminRegister, AdminLogin, AdminSearchEverything } = require("../controllers/admin.controller");
const router = require("express").Router();
require("dotenv").config();

router.post("/register", upload.single("picture"), AdminRegister);
router.patch("/login",  AdminLogin);
router.get('/search', AdminSearchEverything);

module.exports = router;
