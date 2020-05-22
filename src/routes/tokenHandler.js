const jwt = require("jsonwebtoken");
const config = require("config");
const { userModel } = require("../models/userModel");
const util = require("util");
const log = global.log;
let fs = require("fs");

function verifyToken(req, res, next) {
  var token =
    req.body.token || req.query.token || req.headers["x-access-token"];

  log("TOKEN SENT :" + token);
  if (!token) {
    return res.status(403).send({
      success: false,
      message: "No token provided",
    });
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

          res.json({
            success: false,
            message: "Failed to authenticate token",
          });
        }

        let { id } = decoded;
        log("DEcoded User :" + id);

        userModel.getById(id).then(
          (rs) => {
            log("user rs" + util.inspect(rs));
            log("user rs" + util.inspect(rs));

            if (rs.length === 1) {
              next();
            } else {
              res.json({
                success: false,
                message: "user is not valid",
              });
            }
          },
          (err) => {
            res.json({
              success: false,
              message: "UnExpected error",
            });
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
