// const winston = require("../../config/winston");
const util = require("util");

const snakeCaseKeys = require("snakecase-keys");
const camelcaseKeys = require("camelcase-keys");

const { snakeCase } = require("snake-case");
const camelCase = require("camelcase");

const tableRelations = require("./table_relations");
const { queryPromise } = require("./queryPromise");
const R = require("ramda");

const conn = require("../common/dbconn").db;

const { log } = require("../../config/winston");
const { statusCodes, responseHandler } = require("../common/utils");

/*


Implement TRansaction SUPPORT
---------------------------------
  options.sql = 'ROLLBACK';
  connection.query(options, callback);
  ROLLBACK, COMMIT , "START TRANSACTION"
  TRansactions are  implemented as SQL query to DB
-------------------------------------------
Parent-child supported in getALL, create , delete,getById and update

TO-DO:
Relationship can be supported multi-level if object relation ship is captured instead of at table level.
It is easy, only constructor objects to be stored in the MAP

MySQL driver supports connection pooling - not used right now.
It is possible to get a connection the pool dedicated for 1 tranasaction.
connection.release(); // will free a connection taken from the Pool for re-use.
CANNOT use pool.query as it will release a connection after a query, need to retain it to complete a transaction.
So, will write a wrapper on connection - Later :-)

use the template string function to improve the log.
we can inspect passed in values and if objects , we can automatically do util.inspect()

*/

function startTransaction(conn) {
  return new Promise((res, rej) => {
    conn.query({ sql: "START TRANSACTION", value: null }, function (error) {
      if (!error) {
        log("trxn started");
        res({ message: "trxn started", status: statusCodes.NORMAL }); //Ignored
      } else {
        log("trxn could not be started");
        rej({
          requestError: "trxn could not be started",
          status: statusCodes.INTERNAL_SERVER_ERROR,
        });
      }
    });
  });
}

function commitTransaction(conn, retValue) {
  return new Promise((res, rej) => {
    conn.query({ sql: "COMMIT", value: null }, function (error) {
      if (!error) {
        log("COMMIT is success");
        res(retValue);
      } else {
        log("COMMIT failed");
        rej({
          message: "trxn could not be committed",
          status: statusCodes.INTERNAL_SERVER_ERROR,
        });
      }
    });
  });
}

function rollbackTransaction(conn, retValue) {
  return new Promise((res, rej) => {
    conn.query({ sql: "ROLLBACK", value: null }, function (error) {
      if (!error) {
        log(
          "rollback success, but since overall operation failed , failing with error message from trxn"
        );
        rej(retValue);
      } else {
        log("Rollback failed");

        // rej("trxn could not be Rolled back");

        rej({
          message: "trxn could not be Rolled back",
          status: statusCodes.INTERNAL_SERVER_ERROR,
        });
      }
    });
  });
}

//Task object constructor
let bModel = {
  ///////////////////////
  getAll: function () {
    return this.getByAttribute("1", "1");
  },

  //////////////////////////////////
  create: function (newSIABaseModel) {
    // log(util.inspect(newSIABaseModel));
    // log(util.inspect(conn));

    let modelRef = this;
    let newSIABaseModelP = JSON.parse(JSON.stringify(newSIABaseModel));

    if (this.hasChild) {
      delete newSIABaseModelP[camelCase(modelRef.childTable)];
    }

    let finalP = null;

    let mainP = startTransaction(conn).then((trxnstart) => {
      //INSERT of header
      log("TRx started, getting to next stage :" + trxnstart);
      return new Promise(function (res, rej) {
        conn.query(
          `INSERT INTO ${modelRef.tableName} 
                            set ?`,
          snakeCaseKeys(newSIABaseModelP),
          function (err, result) {
            if (err) {
              log("master insert failed", err);
              //# MASK SQL ERROR, keep the error status code.
              rej({
                requestError:
                  "Unexpected error in the server, please contact the Admin.",
                status: statusCodes.INTERNAL_SERVER_ERROR,
              });
            } else {
              log("master insert success");
              res({
                status: statusCodes.NORMAL,
                data: { id: result.insertId },
              });
            }
          }
        );
      });
      //INSERT OF HEADER ENDS
    });

    ////////ACTUAL INSERT

    if (!this.hasChild) {
      finalP = mainP;
    } else {
      finalP = mainP.then((parentResult) => {
        const parentId = parentResult.data.id;
        log("parent Id :" + util.inspect(parentId));

        return Promise.all(
          newSIABaseModel[camelCase(modelRef.childTable)].map((childRow) => {
            let childRowM = {};
            Object.assign(childRowM, snakeCaseKeys(childRow), {
              [modelRef.child_link]: parentId,
            });

            return new Promise(function (res, rej) {
              conn.query(
                `INSERT INTO ${modelRef.childTable} 
                                        set ?`,
                childRowM,
                function (err, result) {
                  if (err) {
                    //rej(err);
                    //MASK the SQL error
                    rej({
                      requestError:
                        "Unexpected error in the server, please contact the Admin.",
                      status: statusCodes.INTERNAL_SERVER_ERROR,
                    });
                  } else {
                    res({
                      status: statusCodes.NORMAL,
                      data: { id: result.insertId },
                    });
                  }
                }
              );
            });
          })
        ).then((res) => {
          return { parentId };
        });
      });
    }
    //ACTUAL INSERT END

    return finalP.then(
      (result) => {
        log(
          "insert operation success, tryng to commit " + util.inspect(result)
        );
        return commitTransaction(conn, {
          data: { id: result.parentId },
          status: statusCodes.NORMAL,
        });
      },
      (insertErr) => {
        log("insert operation failed, trying to rollback");
        return rollbackTransaction(conn, {
          requestError: "Insert operation failed",
          status: statusCodes.INTERNAL_SERVER_ERROR,
        });
      }
    );
  },

  ////////////////////////////////////
  getById: function (id) {
    return this.getByAttribute("id", id);
  },

  //////////////////////////////////
  deleteById: function (id) {
    let modelRef = this;
    let finalP = null;

    let mainP = startTransaction(conn).then((startTrx) => {
      log("Delete TRx started");
      return new Promise(function (res, rej) {
        conn.query(
          `delete from ${modelRef.tableName} where id = ?`,
          [id],
          function (err, result, fields) {
            if (err) {
              rej({
                requestError: err,
                status: statusCodes.INTERNAL_SERVER_ERROR,
              });
            } else {
              res({ data: camelcaseKeys(result), status: statusCodes.NORMAL });
            }
          }
        );
      });
    });

    if (!modelRef.hasChild) {
      finalP = mainP;
      return finalP;
    } else {
      let finalP = mainP.then((deleteResponse) => {
        const deleteOutput = deleteResponse.data;

        return new Promise(function (res_2, rej_2) {
          conn.query(
            `delete from ${modelRef.childTable} where ${modelRef.child_link} = ?`,
            [id],
            function (err, result, fields) {
              if (err) {
                rej_2({
                  status: statusCodes.INTERNAL_SERVER_ERROR,
                  requestError: err,
                });
              } else {
                res_2({
                  data: camelcaseKeys(result),
                  status: statusCodes.INTERNAL_SERVER_ERROR,
                });
              }
            }
          );
        });
      });

      return finalP.then(
        (result) => {
          log(
            "delete operation success, tryng to commit " + util.inspect(result)
          );
          return commitTransaction(conn, result);
        },
        (insertErr) => {
          log("delete operation failed, trying to rollback");
          return rollbackTransaction(conn, insertErr);
        }
      );
    }
  },

  ////////////////////////////////
  updateById: function (id, modifiedSIABaseModel) {
    let modelRef = this;
    let modifiedSIABaseModelP = JSON.parse(
      JSON.stringify(modifiedSIABaseModel)
    );

    if (this.hasChild) {
      delete modifiedSIABaseModelP[camelCase(modelRef.childTable)];
      delete modifiedSIABaseModelP.id;
    }

    let finalP = null;

    let mainP = startTransaction(conn).then((trxnstart) => {
      //Update of header
      log("TRx started, getting to next stage :", trxnstart);
      return new Promise(function (res, rej) {
        conn.query(
          `update ${modelRef.tableName} set ? where id = ?`,
          [snakeCaseKeys(modifiedSIABaseModelP), id],
          function (err, result, fields) {
            if (err) {
              rej({
                requestError: err,
                status: statusCodes.INTERNAL_SERVER_ERROR,
              });
            } else {
              res({ data: camelcaseKeys(result), status: statusCodes.NORMAL });
            }
          }
        );
      });
      //Update OF HEADER ENDS
    });

    /////Child process
    /*
Sample child table array element:

Modes : 
    update -> behaves like header, update columns available. id should be there
    insert -> behaves like NEW, creates a child record. id should NOT be there. will remove if there before sending.
    delete -> behaves like delete, looks for the id in data and deletes it from the table

        {   
            "mode":"update",
            "data":{
                "id": 1,
                "invHdrId": 1,
                "itemCode": "RAM",
                "itemDesc": "Ram item",
                "qty": 1,
                "price": 50
            }
        }

*/

    if (!this.hasChild) {
      finalP = mainP;
    } else {
      finalP = mainP.then(
        (updateRes) => {
          log("parent Id", id);

          return Promise.all(
            modifiedSIABaseModel[camelCase(modelRef.childTable)].map(
              (childRowWrap) => {
                let childRowM = {};
                let childRowData = childRowWrap.data;
                let childMode = childRowWrap.mode;

                log("child_link :", modelRef.child_link);
                log("snakecase child_link :" + snakeCase(modelRef.child_link));

                Object.assign(childRowM, snakeCaseKeys(childRowData), {
                  [snakeCase(modelRef.child_link)]: id,
                });

                log("childRowM :" + util.inspect(childRowM));

                return new Promise(function (res, rej) {
                  //Switch condition to be revised for modes
                  switch (childMode) {
                    //Update case
                    case "update": {
                      let rowForUpdate = JSON.parse(JSON.stringify(childRowM));
                      delete rowForUpdate.id;

                      log("Data to update" + util.inspect(rowForUpdate));

                      conn.query(
                        `UPDATE ${modelRef.childTable} 
                                                set ? where id =?`,
                        [rowForUpdate, childRowData.id],
                        function (err, result) {
                          if (err) {
                            rej({
                              requestError: err,
                              status: statusCodes.INTERNAL_SERVER_ERROR,
                            });
                          } else {
                            res(camelcaseKeys(result));
                          }
                        }
                      );
                      break;
                    }

                    //insert case
                    case "insert": {
                      let rowForInsert = JSON.parse(JSON.stringify(childRowM));
                      delete rowForInsert.id;
                      log("Data to INSERT" + util.inspect(rowForInsert));

                      conn.query(
                        `INSERT INTO ${modelRef.childTable} 
                                                set ?`,
                        rowForInsert,
                        function (err, result) {
                          if (err) {
                            rej({
                              requestErrr: err,
                              status: statusCodes.INTERNAL_SERVER_ERROR,
                            });
                          } else {
                            res({
                              id: result.insertId,
                            });
                          }
                        }
                      );
                      break;
                    }

                    //delete case
                    case "delete": {
                      conn.query(
                        `DELETE FROM ${modelRef.childTable} 
                                                where id = ?`,
                        [childRowData.id],
                        function (err, result) {
                          if (err) {
                            rej({
                              requestError: err,
                              status: statusCodes.INTERNAL_SERVER_ERROR,
                            });
                          } else {
                            res(camelcaseKeys(result));
                          }
                        }
                      );
                      break;
                    }

                    //delete case
                    default: {
                      rej({
                        requestError:
                          "Unsupported mode for update of child record",
                        status: statusCodes.INTERNAL_SERVER_ERROR,
                      });
                      break;
                    }

                    //////
                  } //Switch ENDS
                });
              } // MAP of wrapped CHILD ends
            ) // MAP of wrapped CHILD ends
          ); //Promise ALL
        } // then on mainP
      ); // then on mainP
    } //Has CHild else
    //ACTUAL INSERT END

    return finalP.then(
      (result) => {
        log(
          "update operation success, tryng to commit " + util.inspect(result)
        );
        return commitTransaction(conn, {
          data: { id },
          status: statusCodes.NORMAL,
        });
      },
      (updateErr) => {
        log("update operation failed, trying to rollback", updateErr);
        return rollbackTransaction(conn, {
          requestError: util.inspect(updateErr),
          status: statusCodes.INTERNAL_SERVER_ERROR,
        });
      }
    );

    /*
        return new Promise(function(res, rej){
            conn.query(`update ${modelRef.tableName} set ? where id = ?`
                        , [snakeCaseKeys(modifiedSIABaseModel),id]
                        , function (err, result, fields) {
                            if(err) {
                                rej(err);
                            }
                            else{
                                res( camelcaseKeys(result) );
                            }
                        }
                    );
        });
        */
  },

  /*
  /////////////get by attribute///////////////////////
  getByAttribute: function (attribName, attribValue) {
    // log(`Table name in getAll is ${}`);
    //let tn = this.tableName;
    let modelRef = this;

    let mainP = new Promise(function (res, rej) {
      conn.query(
        `select * from ${modelRef.tableName} where ${attribName} = ?`,
        [attribValue],
        function (err, result, fields) {
          if (err) {
            rej(err);
          } else {
            res(camelcaseKeys(result));
          }
        }
      );
    });

    if (!this.hasChild) {
      return mainP;
    } else {
      return mainP.then(
        (parentRows) => {
          return Promise.all(
            parentRows.map(
              (cv, ind) => {
                return new Promise(function (res, rej) {
                  conn.query(
                    `select * from ${modelRef.childTable} 
                                            where ${modelRef.child_link} = ?`,
                    [cv[modelRef.parent_link]],
                    function (err, childRows, fields) {
                      if (err) {
                        rej(err);
                      } else {
                        res({
                          ...cv,
                          [camelCase(modelRef.childTable)]: camelcaseKeys(
                            childRows
                          ),
                        });
                      }
                    }
                  );
                });
              } //returns a Promise that expands a row
            ) //map ends
          ); // the array of Promise is wrapped inside another Promise
        }
        // , ( err) => {}
      );
    }
  },
};

*/

  /////////////get by attribute///////////////////////
  getByAttribute: async function getByAttribute(attribName, attribValue) {
    // log(`Table name in getAll is ${}`);
    //let tn = this.tableName;
    const modelRef = this;
    /*
  trying to describe the function in function terms

  query the correct table -> results camel cased -> cond ([ has child , <> ] ,  [has no child , <>])

  */

    log(
      "Parent SQL :",
      `select * from ${modelRef.tableName} where ${attribName} = ?`,
      attribValue
    );
    const parentResults = await queryPromise(
      `select * from ${modelRef.tableName} where ${attribName} = ?`,
      [attribValue]
    ).then((res) => camelcaseKeys(res));

    log("parent results :", parentResults);

    if (!this.hasChild) {
      return {
        data: parentResults,
        status: statusCodes.NORMAL,
      };
    }

    const consolidatedRows = await Promise.all(
      parentResults.map((cv) => {
        return queryPromise(
          `select * from ${modelRef.childTable} 
    where ${modelRef.child_link} = ?`,
          cv[modelRef.parent_link]
        ).then(
          (res) => {
            return {
              ...cv,
              [camelCase(modelRef.childTable)]: camelcaseKeys(res),
            };
          },
          (rej) => {
            log("Error in create", rej);
            //#MASK SQL errors
            return Promise.reject({
              requestError: "Unexpected server error, contact Admin",
              status: statusCodes.INTERNAL_SERVER_ERROR,
            });
          }
        );
      })
    );

    log("consolidatedRows :", consolidatedRows);

    return {
      data: consolidatedRows,
      status: statusCodes.NORMAL,
    };
  },
};

function buildBaseModel(tableName) {
  bModel.tableName = tableName;

  if (tableRelations.has(tableName)) {
    bModel.hasChild = true;
    bModel.childTable = tableRelations.get(tableName).child;
    bModel.parent_link = tableRelations.get(tableName).parent_link;
    bModel.child_link = tableRelations.get(tableName).child_link;
  } else {
    bModel.hasChild = false;
    bModel.childTable = null;
    bModel.parent_link = null;
    bModel.child_link = null;
  }
  return { ...bModel };
}

module.exports = { buildBaseModel };
