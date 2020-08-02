const express = require("express");

const { log } = require("../../config/winston");

const util = require("util");

const produce = require("immer");
const { statusCodes, responseHandler } = require("../common/utils");
//API design guidelines
//https://hackernoon.com/restful-api-designing-guidelines-the-best-practices-60e1d954e7c9
// 1.Add version number to API end point
// 2.Sort convention - GET /companies?sort=rank_asc
// 3.filter convention - GET /companies?category=banking&location=india
// 4.search convention - GET /companies?search=Digital Mckinsey
// 5. GET /companies?page=23&pagesize=25
// but for more efficient pagination , better to pass the value of the column that is being sorted as cut-off if is a Unique column
// if sort is on non-unique value , then there is no choice.
// All of them are easy to implement and hence differing for later

//https://medium.com/@salonimalhotra1ind/pagination-in-node-express-mysql-eda52bf605b7

function recordGroupRoute(model) {
  const baseRouter = express.Router();

  //get by id
  baseRouter.get("/:rgname", (request, response) => {
    model.getByRG(request.params.rgname).then(
      (s) => {
        responseHandler(response, s);
      },
      (r) => {
        responseHandler(response, {
          status: statusCodes.NORMAL,
          requestError: "Unable to process the requested RG name",
        });
      }
    );
  });
  return baseRouter;
}

//JSON.stringigy does not give JSON rep of the error
//Take message from the error and print it if required

module.exports = { recordGroupRoute };
