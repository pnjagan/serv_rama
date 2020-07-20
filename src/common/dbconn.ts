const mysql = require("mysql");
const config = require("config");

const db = mysql.createConnection(config.connect_url);

// connect to database
db.connect((err: any) => {
  if (err) {
    throw err;
  }
  console.log("Connected to database");
});

module.exports = {
  db,
};
