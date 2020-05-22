const express = require("express");
const log = global.log;
const util = require("util");

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

function buildBaseRouter(model) {
  const baseRouter = express.Router();

  baseRouter.post("/", (req, res) => {
    model.create(req.body).then(
      (s) => {
        res.json(s);
      },
      (r) => {
        log("Reject Object :" + util.inspect(r));
        log("Reject Obj JSON :" + JSON.stringify(r));

        res.status(500).json({
          message: "Operation failed , please refer the application log!",
        });
      }
    );
  });

  //get all items
  baseRouter.get("/", (req, res) => {
    model.getAll().then(
      (s) => {
        res.json({ result: s });
      },
      (r) => {
        log("Reject Object :" + util.inspect(r));
        log("Reject Obj JSON :" + JSON.stringify(r));

        res.status(500).json({
          message: "Operation failed , please refer the application log!",
        });
      }
    );
  });

  //get by id
  baseRouter.get("/:id", (req, res) => {
    model.getById(req.params.id).then(
      (s) => {
        res.json({ result: s });
      },
      (r) => {
        log("Reject Object :" + util.inspect(r));
        log("Reject Obj JSON :" + JSON.stringify(r));

        res.status(500).json({
          message: "Operation failed , please refer the application log!",
        });
      }
    );
  });

  //delete by id
  baseRouter.delete("/:id", (req, res) => {
    model.deleteById(req.params.id).then(
      (s) => {
        res.json({ result: s });
      },
      (r) => {
        log("Reject Object :" + util.inspect(r));
        log("Reject Obj JSON :" + JSON.stringify(r));

        res.status(500).json({
          message: "Operation failed , please refer the application log!",
        });
      }
    );
  });

  //update by id
  baseRouter.put("/:id", (req, res) => {
    log("Modified item at Rt: " + util.inspect(req.body));

    model.updateById(req.params.id, req.body).then(
      (s) => {
        res.json({ result: s });
      },
      (r) => {
        log("Reject Object :" + util.inspect(r));
        log("Reject Obj JSON :" + JSON.stringify(r));

        res.status(500).json({
          message: "Operation failed , please refer the application log!",
        });
      }
    );
  });

  return baseRouter;
}

//JSON.stringigy does not give JSON rep of the error
//Take message from the error and print it if required

module.exports = { buildBaseRouter };
