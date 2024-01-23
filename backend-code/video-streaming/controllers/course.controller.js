const catchAsync = require("../utils/errors/catchAsync");
const crypto = require("crypto");

const encryptVideo = require("../utils/encryptVideo");
const path = require("path");
const { initializeApp } = require("firebase/app");
const {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytesResumable,
} = require("firebase/storage");
const Modules = require("../models/modules.schema");
const AppError = require("../utils/errors/AppError");
const Courses = require("../models/courses.model");
const firebaseConfig = require("../utils/firebase.config");
const axios = require("axios");
const decryptVideo = require("../utils/decryptVideo");
// const fs = require("fs");
// const getVideoDurationInSeconds = require("get-video-duration");
const key = Buffer.from(process.env.key, "hex");
const iv = Buffer.from(process.env.iv, "hex");

module.exports.UploadVideo = catchAsync(async (req, res, next) => {
  
  const file = req.file;
  const { module_name, subscriptionRequired } = req.body;
  

  // ffmpeg.ffprobe(file.originalname, (err, metadata) => {
  //   if (err) {
  //     console.log(err.message);
  //     return next(new AppError(`${err.message}`, 402));
  //   }
  //   const durationInSeconds = metadata.format.duration;
  //   console.log(`Movie duration is ${durationInSeconds}`);
  // });

  const encryptedFile = await encryptVideo(file.buffer, key, iv);

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
    encryptedFile,
    metadata
  );
  // Grab the public url
  const downloadURL = await getDownloadURL(snapshot.ref);

  const createLessons = await Modules({
    module_name,
    firebase_id: downloadURL,
    // duration: durationInSeconds,
    subscriptionRequired,
  });
  await createLessons.save();

  res.status(200).json({
    success: true,
    message: "Course module succesfully uploaded",

    createLessons,
  });
});

module.exports.CreateCourses = catchAsync(async (req, res, next) => {
  const { title, creator, thumbnail, description, price, lessons } = req.body;
  const findCourseByName = await Courses.findOne({ title });
  if (findCourseByName) {
    return next(new AppError("Course with this name already exist", 403));
  }

  const createCourse = await Courses({
    title,
    creator,
    thumbnail,
    description,
    price,
    lessons,
  });
  await createCourse.save();

  res.status(200).json({
    success: true,
    message: "Course created succesfully",
    createCourse,
  });
});
module.exports.GetCourseDetails = catchAsync(async (req, res, next) => {
  const courseId = req.params.courseId;

  // console.log(findCourseById)

  const findCourseById = await Courses.findById(courseId);
  
  if (!findCourseById) {
    return next(
      new AppError("This course does not exist. Please check course ID", 403)
    );
  }

  const innerCourseId = await findCourseById.populate({
    path: "lessons",
    populate: {
      path: "modules",
    },
  });
  
  // const videoId = req.body.videoId || innerCourseId.lessons[0].modules[0].id;
  // console.log(videoId);

  // return res.json({innerCourseId})
  
  // const findIfVideoExistInsideCourse = innerCourseId.lessons[0].modules.find(
  //   (id) => id == videoId
  // );
  // console.log(findIfVideoExistInsideCourse)
  // if (findIfVideoExistInsideCourse !== undefined || null) {
  //   return next(
  //     new AppError(
  //       "You do not have access to this lesson. Kindly purchase the course to have access",
  //       403
  //     )
  //   );
  // }
  // console.log(findIfVideoExistInsideCourse)
  // // const newId = findCourseById;
  // const videoToPlay = await Modules.findById(findIfVideoExistInsideCourse);
  // if (videoToPlay.subscriptionRequired == true) {
  //   return next(new AppError("You have not subscribed to this course", 401));
  // }

  // //Getting MetaData about the video file to determine its size
  // const fileStat = await file.getMetadata();
  // const fileSize = fileStat[0].size;
  // console.log(range);
  res.status(200).json({
    status: "ok",
    success: true,
    message: "Course details fetched succesfully",
    courseDetails: innerCourseId,
    // videoToPlay,
  });
});

module.exports.GetAllCourses = catchAsync(async (req, res, next) => {
  const AllCourses = await Courses.find();
  res.status(202).json({
    status: "ok",
    success: true,
    message: "All Courses fetched succesfully",
    AllCourses,
  });
});


module.exports.SearchCourse = catchAsync(async (req, res, next)=>{
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


module.exports.PlayDecryptVideo = catchAsync(async (req, res, next) => {
  const { url } = req.body;
  // Make a request to Firebase storage
  try {
    const feedback = await axios.get(url, {
      responseType: "arraybuffer", // Set the responseType to 'arraybuffer' for binary data
    });
  
    const decryptedVideo = await decryptVideo(feedback.data, key, iv);
    // console.log(decryptedVideo);
    res.status(202).json({
      status: "ok",
      success: true,
      message: "Video fetched succesfully from Firebase storage",
      video: decryptedVideo,
    });
  } catch (error) {
    throw new Error(error);
  }
  //console.log the decrypted file
});
