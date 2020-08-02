import express, { Application, Request, Response, NextFunction } from "express";
const morgan = require("morgan");
const path = require("path");

const cors = require("cors");
const util = require("util");

const winston = require("../config/winston");

const log = winston.log;

const app: Application = express();
const port = 3100;

const options = {
  //  server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
  //  replset: { socketOptions: { keepAlive: 1, connectTimeoutMS : 30000 } },
  useNewUrlParser: true,
};

// var global = {};
app.use(cors());

app.use(morgan("combined", { stream: winston.stream }));

const publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));

// parse application/json and look for raw text
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// imports - Starts

const userAuthenticate = require("./routes/userAuthenticate");
// imports - Ends
const { verifyToken } = require("./routes/tokenHandler");

//Router Starts

//THIS STEP WILL NOT NEED A TOKEN @user-auth
//INCLUDE the userAuthenticate ROUTE that will generate a TOKEN
app.use("/", userAuthenticate);

app.use("/", verifyToken);

//THIS ROUTE is for VALIDATING IF TOKEN is VALID  @user-auth

const { buildBaseModel } = require("./models/baseModel");
const { customerModel } = require("./models/customerModel");
const { buildBaseRouter } = require("./routes/baseRouter");

app.use("/params", buildBaseRouter(buildBaseModel("parameters")));

app.use("/customers", buildBaseRouter(customerModel));

app.use("/items", buildBaseRouter(buildBaseModel("items")));

app.use("/invoices", buildBaseRouter(buildBaseModel("invoices")));

const { recordGroupRoute } = require("./routes/recordGroupRoute");
const { rgModel } = require("./models/recordGroupModel");

app.use("/recordgroup", recordGroupRoute(rgModel));

//Router Ends

log("processing request - Rama nama jayam");

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Rama Invoice App Server!" });
});

app.listen(port, () =>
  console.log(`RIA listening at http://localhost:${port}`)
);
