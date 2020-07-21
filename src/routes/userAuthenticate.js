const express = require("express");
const { log } = require("../../config/winston");
const util = require("util");
var bouncer = require("express-bouncer")(500, 900000);
const { userModel } = require("../models/userModel");

const { generateToken } = require("./tokenHandler");

const bcrypt = require("bcrypt");

const { snakeCase } = require("snake-case");
const camelCase = require("camelcase");

const snakeCaseKeys = require("snakecase-keys");
const camelcaseKeys = require("camelcase-keys");

const jwt = require("jsonwebtoken");
let fs = require("fs");
const config = require("config");

const { statusCodes, responseHandler } = require("../common/utils");

//@user-auth

let userAuth = express.Router();

// Add white-listed addresses (optional)
bouncer.whitelist.push("127.0.0.1");
bouncer.whitelist.push("localhost");

// In case we want to supply our own error (optional)
bouncer.blocked = function (req, res, next, remaining) {
  res.send(
    429,
    "Too many requests have been made, " +
      "please wait " +
      remaining / 1000 +
      " seconds"
  );
};

let saltRounds = 10;
// let userModel = new User();

userAuth.post("/signup", bouncer.block, function (request, response) {
  const userData = request.body;
  // const password = req.body.password;
  log("Inside signup");

  //using weak equals to check for both undefined and null
  if (userData.userLogin == undefined || userData.password == undefined) {
    log("login details invalid");

    responseHandler(response, {
      status: statusCodes.INVALID_REQUEST,
      requestError: "Invalid user details",
    });

    // res.status(500).json({ message: "Authentication failed.!" });
    return;
  }

  log("login details Valid");

  userModel.getByAttribute("user_login", userData.userLogin).then(
    (userRS) => {
      log("user result :" + util.inspect(userRS));

      if (userRS.data.length !== 0) {
        log("User exists");

        responseHandler(response, {
          status: statusCodes.INVALID_REQUEST,
          requestError: "User already exists.!",
        });

        // res.status(500).json({ message: "User already exists.!" });
        return;
      }

      log("User does not exists");
      let userDataDB = JSON.parse(JSON.stringify(snakeCaseKeys(userData)));
      delete userDataDB.password;
      delete userDataDB.id;
      log("user to create :" + util.inspect(userDataDB));

      bcrypt.hash(userData.password, saltRounds, function (err, hash) {
        // Store hash in your password DB.
        if (!err) {
          userDataDB.userHash = hash;
          userModel.create(userDataDB).then(
            (s) => {
              bouncer.reset(request);

              responseHandler(response, {
                status: statusCodes.NORMAL,
                message: "user created successfully!",
              });
            },
            (r) => {
              //res.json({ message: "user creation failed!" })
              responseHandler(response, {
                status: statusCodes.INTERNAL_SERVER_ERROR,
                requestError: "user creation failed!",
              });
            }
          );
        } else {
          log("hash creation failed!" + err);

          responseHandler(response, {
            status: statusCodes.INTERNAL_SERVER_ERROR,
            requestError: "user creation failed!",
          });

          // res.json({ message: "user creation failed!" });
        }
      });
    },
    (err) => {
      log("error in get user by Attrib" + err);

      // res.json({ message: "user creation failed!" });
      responseHandler(response, {
        status: statusCodes.INTERNAL_SERVER_ERROR,
        requestError: "user creation failed!",
      });
    }
  );
});

userAuth.post("/login", bouncer.block, function (request, response) {
  const userData = request.body;
  // const password = req.body.password;

  //log("Complete REQ", req); // prints too much details

  //using weak equals to check for both undefined and null
  if (
    userData.userLogin == undefined ||
    (userData.password == undefined && userData.jwtToken == undefined)
  ) {
    log("login details invalid");

    responseHandler(response, {
      status: statusCodes.NO_AUTHORIZATION,
      requestError: "Authentication failed.!",
    });

    // res.status(401).json({ message: "Authentication failed.!" });
    return;
  }

  log("login details Valid :" + userData.userLogin);

  //Password based Authenticate
  if (userData.password != undefined) {
    userModel.getByAttribute("user_login", userData.userLogin).then(
      (userRS) => {
        log("user result :" + util.inspect(userRS));
        log(" userRS.data.length :", userRS.data.length);

        if (userRS.data.length !== 1) {
          log("user login does not exist");

          // .set({
          //     'WWW-Authenticate': 'Basic realm="Access to SIA Dev"'
          //   }).

          responseHandler(response, {
            status: statusCodes.NO_AUTHORIZATION,
            requestError: "Invalid login!",
          });

          // res.status(401).json({ message: "Invalid login!" });
          return;
        }

        log("User does exist");
        let userDataDB = userRS.data[0]; //JSON.parse(JSON.stringify(snakeCaseKeys(userData)));
        // delete userDataDB.password;
        // delete userDataDB.id;
        log("user to validate :", JSON.stringify(userDataDB));
        log(
          "args to bcrypt compare :",
          userData.password,
          " - ",
          userDataDB.userHash
        );

        bcrypt.compare(userData.password, userDataDB.userHash, function (
          errBcrypt,
          resBcrypt
        ) {
          if (!resBcrypt) {
            log("password to hash check failed" + errBcrypt);

            responseHandler(response, {
              status: statusCodes.NO_AUTHORIZATION,
              requestError: "Authentication failed.!",
            });

            // res.status(401).json({ message: "Authentication failed.!" });
            return;
          }

          generateToken(userDataDB.id).then(
            (s) => {
              log("Token generated! :" + s);
              bouncer.reset(request);

              responseHandler(response, {
                status: statusCodes.NORMAL,
                data: {
                  jwtToken: s,
                  userLogin: userDataDB.userLogin,
                  userName: userDataDB.userName,
                },
              });
            },
            (r) => {
              log("Error in token creation");

              responseHandler(response, {
                status: statusCodes.INTERNAL_SERVER_ERROR,
                requestError: "Unexpected Login failure, please try again.",
              });
            }
          );
        });
      },
      (err) => {
        log("error in get user by Attrib" + err);

        responseHandler(response, {
          status: statusCodes.INTERNAL_SERVER_ERROR,
          requestError: "Unexpected Login failure, please try again.",
        });
      }
    );
  } //Password based Authenticate

  //JWT based Authenticate
  /*****************START OF TOKEN VERIFY****************** */

  if (userData.jwtToken != undefined) {
    userModel.getByAttribute("user_login", userData.userLogin).then(
      (userRS) => {
        log("user result :" + util.inspect(userRS));

        if (userRS.data.length !== 1) {
          log("user login does not exist");

          // .set({
          //     'WWW-Authenticate': 'Basic realm="Access to SIA Dev"'
          //   }).

          responseHandler(response, {
            status: statusCodes.NO_AUTHORIZATION,
            requestError: "Invalid login!",
          });

          // res.status(401).json({ message: "Invalid login!" });
          return;
        }

        log("User does exist");
        let userDataDB = userRS.data[0]; //JSON.parse(JSON.stringify(snakeCaseKeys(userData)));
        // delete userDataDB.password;
        // delete userDataDB.id;
        log("user to validate :" + util.inspect(userDataDB));

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
          log(`Public key being passed ${jwtPublicKey}`);

          jwt.verify(
            userData.jwtToken,
            jwtPublicKey,
            { algorithms: ["RS256"] },
            function (err, decoded) {
              if (err) {
                log("Error from jwt verity :" + err);

                log("password to hash check failed", userData.jwtToken);

                responseHandler(response, {
                  status: statusCodes.NO_AUTHORIZATION,
                  requestError: "Authentication failed.!",
                });

                // res.status(401).json({ message: "Authentication failed.!" });
                return;

                // res.json({
                //     success: false,
                //     message: 'Failed to authenticate token'
                // });
              }

              let { id } = decoded;
              log("DEcoded User :", id);

              userModel.getById(id).then(
                (rs) => {
                  log("user rs 2 :" + util.inspect(rs));
                  // log('user rs'+util.inspect(rs));
                  log("-----------------");

                  log(
                    "CHECK*",
                    rs.data.length,
                    "*",
                    rs.data[0].userLogin,
                    "*",
                    userData.userLogin,
                    "*"
                  );

                  log(
                    "check bool *",
                    rs.data.length === 1 &&
                      rs.data[0].userLogin === userData.userLogin
                  );

                  if (
                    rs.data.length === 1 &&
                    rs.data[0].userLogin === userData.userLogin
                  ) {
                    log("Token validated! :");
                    bouncer.reset(request);

                    responseHandler(response, {
                      status: statusCodes.NORMAL,
                      data: {
                        jwtToken: userData.jwtToken,
                        userLogin: rs.data[0].userLogin,
                        userName: rs.data[0].userName,
                      },
                    });
                  } else {
                    log(
                      "TOken error",
                      rs.data.length,
                      rs.data[0].userLogin,
                      userData.userLogin
                    );

                    responseHandler(response, {
                      status: statusCodes.NO_AUTHORIZATION,
                      requestError: "Authentication failed.!",
                    });
                  }
                },
                (err) => {
                  log("Error in token validation");

                  responseHandler(response, {
                    status: statusCodes.INTERNAL_SERVER_ERROR,
                    requestError: "Unexpected Login failure, please try again.",
                  });

                  // res.status(500).json({
                  //   message: "Unexpected Login failure, please try again.",
                  // });
                }
              ); // get userByID ends
            } //Token verify call back function
          );
        });
        /*****************END OF TOKEN VERIFY****************** */
      },
      (err) => {
        log("error in get user by Attrib" + err);

        responseHandler(response, {
          status: statusCodes.INTERNAL_SERVER_ERROR,
          requestError: "Unexpected Login failure, please try again.",
        });

        // res
        //   .status(500)
        //   .json({ message: "Unexpected Login failure, please try again." });
      }
    );
  } //JWT based Authenticate
}); // Token create

module.exports = userAuth;
