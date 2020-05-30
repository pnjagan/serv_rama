let conn = global.db;
const log = global.log;

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
