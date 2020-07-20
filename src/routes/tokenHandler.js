const jwt = require("jsonwebtoken");
const config = require("config");
const { userModel } = require("../models/userModel");
const util = require("util");
const { log } = require("../../config/winston");

const { responseHandler, statusCodes } = require("../common/utils");

let fs = require("fs");

function verifyToken(request, response, next) {
  var token =
    request.body.token ||
    request.query.token ||
    request.headers["x-access-token"];

  log("TOKEN SENT :" + token);
  if (!token) {
    responseHandler(
      response,

      {
        status: statusCodes.FORBIDDEN,
        requestError: "No token provided",
      }
    );
    return;

    // return res.status(403).send({
    //   success: false,
    //   message: "No token provided",
    // });
  }

  new Promise((res, rej) => {
    fs.readFile(config.jwtPublicKey, "utf8", function (err, contents) {
      if (!err) {
        log("Key value" + contents);
        res(contents);
      } else {
        log("Error in finding Key value" + err);
        rej(err);
      }
      // console.log(contents);
    });
  }).then((jwtPublicKey) => {
    jwt.verify(
      token,
      jwtPublicKey,
      { algorithms: ["RS256"] },
      function (err, decoded) {
        if (err) {
          log("Error from jwt verity :" + err);

          responseHandler(
            response,

            {
              status: statusCodes.FORBIDDEN,
              requestError: "Failed to authenticate token",
            }
          );
        }

        let { id } = decoded;
        log("DEcoded User :" + id);

        userModel.getById(id).then(
          (rs) => {
            log("user rs" + util.inspect(rs));

            if (rs.data.length === 1) {
              log("Next called in Token handler");
              next();
            } else {
              responseHandler(
                response,

                {
                  status: statusCodes.FORBIDDEN,
                  requestError: "user is not valid",
                }
              );
            }
          },
          (err) => {
            responseHandler(
              response,

              {
                status: statusCodes.INTERNAL_SERVER_ERROR,
                requestError: "Unexpected error",
              }
            );
          }
        ); // get userByID ends
      } //Token verify call back function
    );
  });
}

function generateToken(id) {
  log("generate token called");
  log("private key" + config.jwtTokenSecret);

  try {
    let keyP = new Promise((res, rej) => {
      fs.readFile(config.jwtTokenFile, "utf8", function (err, contents) {
        if (!err) {
          log("Key value" + contents);
          res(contents);
        } else {
          log("Error in finding Key value" + err);
          rej(err);
        }
        // console.log(contents);
      });
    });

    let p = keyP.then((key) => {
      return new Promise((res, rej) => {
        jwt.sign({ id }, key, { algorithm: "RS256" }, function (err, token) {
          if (err) {
            log("Token creation failed" + err);
            rej("Token creation failed");
          } else {
            log("Token created " + token);
            res(token);
          }
        });
      });
    });

    log("Promise generated :" + util.inspect(p));
    return p;
  } catch (e) {
    log("Error encountered" + util.inspect(e));
    return Promise.reject("Error encountered when generating a token");
  }
}

module.exports = { verifyToken, generateToken };
