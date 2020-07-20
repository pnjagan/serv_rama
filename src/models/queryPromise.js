const conn = require("../common/dbconn").db;
const { log } = require("../../config/winston");

function queryPromise(sql, binds) {
  return new Promise((res, rej) => {
    conn.query(sql, binds, function (err, result) {
      if (err) {
        rej(err);
      } else {
        res(result);
      }
    });
  });
}

module.exports = { queryPromise };
