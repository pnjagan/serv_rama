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

//Task object constructor
let rgModel = {
  getByRG: async function getByRG(rgname) {
    let rgSQL = null;

    switch (rgname) {
      case "CustomerRG":
        rgSQL = "select id, customer_num , customer_name from customers";
        break;
      default:
        rgSQL = null;
        break;
    }

    if (rgSQL != null) {
      const rgResults = await queryPromise(rgSQL).then((res) =>
        camelcaseKeys(res)
      );
      log("RG results :", rgResults);
      return {
        data: rgResults,
        status: statusCodes.NORMAL,
      };
    } else {
      return {
        requestError: "Requested RG name not supported!",
        status: statusCodes.NORMAL,
      };
    }
  },
};

module.exports = { rgModel };
