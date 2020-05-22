const express = require("express");
const morgan = require("morgan");
const path = require("path");
const config = require("config");
const mysql = require("mysql");
const cors = require("cors");
const util = require("util");

const winston = require("../config/winston");

global.log = winston.log;
global.errLog = winston.errLog;

const app = express();
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

const db = mysql.createConnection(config.connect_url);

// connect to database
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Connected to database");
});

global.db = db;

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
const { buildBaseRouter } = require("./routes/baseRouter");

app.use("/customers", buildBaseRouter(buildBaseModel("customers")));
app.use("/items", buildBaseRouter(buildBaseModel("items")));
app.use("/params", buildBaseRouter(buildBaseModel("params")));
app.use("/invoices", buildBaseRouter(buildBaseModel("invoices")));

//Router Ends

log("processing request - Rama nama jayam");

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Rama Invoice App Server!" });
});

app.listen(port, () =>
  console.log(`RIA listening at http://localhost:${port}`)
);
