const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const morgan = require("morgan");
require("dotenv").config();

const globalErrorHandler = require("./utils/errors/errorController");
const AppError = require("./utils/errors/AppError");
const videoRouter = require("./routes/videos");
const userRouter = require("./routes/user.routes");
const adminRouter = require("./routes/admin.routes");
const paymentRouter = require('./routes/purchase.routes');
const Connect = require("./utils/Db.config");
const Limiter = require("./middleware/Limiter");

const app = express();

// Handling uncaught exception
process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  console.log("Unhandled Exception, shutting down");
  process.exit(1);
});

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(xss());
app.use(mongoSanitize());
app.use(morgan("dev"));
app.use(cookieParser());
app.use("/api", videoRouter);
app.use("/api/auth", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/payment", paymentRouter);

app.all("*", (req, res, next) => {
  next(
    new AppError(
      `Can not find ${req.originalUrl} with ${req.method} on this server`,
      501
    )
  );
});
app.use(globalErrorHandler);

const Port = process.env.PORT || 7070;
const server = Connect().then(() =>
  app.listen(Port, () => console.log(`Server runing on localhost ${Port}`))
);

//Handling unHandled Rejections
process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("Unhandled Rejection, shutting down");
  server.close(() => {
    process.exit(1);
  });
});
