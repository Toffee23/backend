const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/errors/catchAsync");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
const { initializeApp } = require("firebase/app");
const {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytesResumable,
} = require("firebase/storage");
const firebaseConfig = require("../utils/firebase.config");
require("dotenv").config();
const Admin = require("../models/admin.model");
const Courses = require("../models/courses.model");
const AppError = require("../utils/errors/AppError");


module.exports.AdminRegister = catchAsync(async (req, res, next) => {
  let { first_name, last_name, email, password } = req.body;
  const file = req.file;
  const findUser = await Admin.findOne({ email });
  if (findUser) {
    return next(new AppError("User already exist", 402));
  }

  const filename =
    crypto.randomBytes(16).toString("hex") + path.extname(file.originalname);
  //Initialize a firebase application
  initializeApp(firebaseConfig);
  // Initialize Cloud Storage and get a reference to the service
  const storage = getStorage();
  // Create file metadata including the content type
  const metadata = {
    contentType: req.file.mimetype,
  };
  const storageRef = ref(storage, filename);
  // Upload the file in the bucket storage
  const snapshot = await uploadBytesResumable(
    storageRef,
    file,
    metadata
  );
  // Grab the public url
  const downloadURL = await getDownloadURL(snapshot.ref);
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(downloadURL)
  const createAdmin = await Admin.create({
    first_name,
    last_name,
    profile_picture: downloadURL,
    email,
    password: hashedPassword,
  });

//   await createUser.save();
  return res.status(202).json({
    status: "ok",
    message: "Admin account created succesfully",
    createAdmin,
  });
});

module.exports.AdminLogin = catchAsync(async (req, res, next) => {
  const { email, password, rememberMe } = req.body;
  const findUser = await Admin.findOne({ email });
  if (!findUser) {
    return next(new AppError("User does not exist", 404));
  }
  const passwordMatch = await bcrypt.compare(password,findUser.password )

  if (!passwordMatch) {
    return next(new AppError("Incorrect login details", 404));
  }
  const tokenExpiration = rememberMe ? "7d" : "1d";
  const secureOption =
    req.protocol === "https" || process.env.NODE_ENV !== "development"
      ? true
      : false;

  const admin_auth = jwt.sign({ id: findUser._id }, process.env.Jwt_Secret_Key, {
    expiresIn: tokenExpiration,
  });

  res.cookie("admin_auth", admin_auth, {
    httpOnly: true,
    secure: secureOption,
  });
  res
    .status(202)
    .json({ status: "ok", message: "Admin succesfully logged in", findUser });
});

module.exports.AdminChangePassword = catchAsync(async (req, res, next)=>{

})

module.exports.AdminSearchEverything = catchAsync(async (req, res, next)=>{
    const {searchTerm } = req.query;
    if (searchTerm == "" || undefined){
        return next(new AppError("Search query not found. Please enter a course you want to search for", 404));
    }
    const resultFromCourses = await Courses.find({title:{$regex:searchTerm, $options:"i"}});
    if(resultFromCourses.length ==0){
        return next(new AppError(`Could not find anything with value ${searchTerm}`, 404));
    }
    res.status(200). json({success:true, status:"ok", resultFromCourses})
})
