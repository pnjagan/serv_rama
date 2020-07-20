const { buildBaseModel } = require("./baseModel.js");
const { queryPromise } = require("./queryPromise");
const { statusCodes, responseHandler } = require("../common/utils");

const conn = require("../common/dbconn").db;
const { log } = require("../../config/winston");

const produce = require("immer");

// Task object constructor
// Customer extends bm.SIABaseModel

const baseModel = buildBaseModel("customers");
const customerModel = {
  ...baseModel,
  create: function (customerData) {
    log("Extended create of customer :", customerData);
    return queryPromise(
      "select count(1) count from customers where customer_num = ?",
      customerData.customerNum
    )
      .then(
        (res) => {
          if (res[0].count === 0) {
            return Promise.resolve(0);
          } else {
            return Promise.reject({
              status: statusCodes.NORMAL,
              detailError: {
                customerNum: "Customer number should be unique",
              },
            });
          }
        },
        (rej) => {
          return Promise.reject(
            //"Customer number validation failed"
            {
              status: statusCodes.NORMAL,
              requestError: "Customer number should be unique",
            }
          );
        }
      )
      .then((res) => {
        return baseModel.create(customerData);
      });
  },
};

module.exports = { customerModel };
