const { buildBaseModel } = require("./baseModel.js");
const { queryPromise } = require("./queryPromise");
const {
  internalErrorMsg,
  badRequestErrorMsg,
  authorizationErrorMsg,
  resourceNotFoundErrorMsg,
  normalResponse,
  responseHandler,
} = require("../common/utils");

let conn = global.db;
const log = global.log;
const produce = require("immer");

// Task object constructor
// Customer extends bm.SIABaseModel

const baseModel = buildBaseModel("customers1");
const customerModel = {
  ...baseModel,
  create: function (customerModel) {
    log("Extended create of customer :", customerModel);
    return queryPromise(
      "select count(1) count from customers where customer_num = ?",
      customerModel.customerNum
    )
      .then(
        (res) => {
          if (res[0].count === 0) {
            return Promise.resolve(0);
          } else {
            return Promise.reject(
              normalResponse({
                detailError: {
                  customerNum: "Customer number should be unique",
                },
              })
            );
          }
        },
        (rej) => {
          return Promise.reject(
            //"Customer number validation failed"
            normalResponse({
              requestError: "Customer number should be unique",
            })
          );
        }
      )
      .then((res) => {
        return baseModel.create(customerModel);
      });
  },
};

module.exports = { customerModel };
