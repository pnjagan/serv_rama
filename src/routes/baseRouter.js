const express = require("express");

const { log } = require("../../config/winston");

const util = require("util");

const produce = require("immer");
const { responseHandler } = require("../common/utils");
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

//Probably login is mandatory and can be done after APP is built in react.

// const normalResp = (resp) => ({ status: 200, result: resp });

function buildBaseRouter(model) {
  const baseRouter = express.Router();

  baseRouter.post("/", (request, response) => {
    model.create(request.body).then(
      (s) => {
        log("create s :", s);
        responseHandler(response, s);
      },
      (r) => {
        log("create r :", r);
        responseHandler(response, r);
      }
    );
  });

  //get all items
  baseRouter.get("/", (request, response) => {
    log("Inside get ALL");
    model.getAll().then(
      (s) => {
        responseHandler(response, s);
      },
      (r) => {
        responseHandler(response, r);
      }
    );
  });

  //get by id
  baseRouter.get("/:id", (request, response) => {
    model.getById(request.params.id).then(
      (s) => {
        responseHandler(response, s);
      },
      (r) => {
        responseHandler(response, r);
      }
    );
  });

  //delete by id
  baseRouter.delete("/:id", (request, response) => {
    model.deleteById(request.params.id).then(
      (s) => {
        responseHandler(response, s);
      },
      (r) => {
        responseHandler(response, r);
      }
    );
  });

  //update by id
  baseRouter.put("/:id", (request, response) => {
    log("Modified item at Rt: " + util.inspect(request.body));

    model.updateById(request.params.id, request.body).then(
      (s) => {
        log("update s :", s);
        responseHandler(response, s);
      },
      (r) => {
        log("update r :", r);
        responseHandler(response, r);
      }
    );
  });

  return baseRouter;
}

//JSON.stringigy does not give JSON rep of the error
//Take message from the error and print it if required

module.exports = { buildBaseRouter };
