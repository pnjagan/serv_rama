/* Immer does exactly what doc updated does, only much BETTER */
//function docPropUpdater(prop, doc, ignoreFields, copyAllFields) {
// const winston = require("../../config/winston");

const { log } = require("../../config/winston");

// const log = global.log;
// const errLog = global.errLog;
//no use export - just a place holder

const { produce } = require("immer");

/*

{
  status : "This field will be sent by the model but stripped off by the router before forwarding
  data : {
   // whatever data to be sent.
   // will be fields or array of records in case of get request
  },
  requestError : {
   // Request level failure 
  },
  detailError : {
    // field level error, structure to reflect the structure of the from like..
    field1 : error1,
    field2 : error2
  }
}

*/

/*

function internalErrorMsg() {
  return {
    status: 500,
    requestError:
      "Unexpected error in processing the request, please contact the support",
  };
}

function badRequestErrorMsg() {
  return {
    status: 400,
    requestError: "The request is invalid, please check your request.",
  };
}

function authorizationErrorMsg(error) {
  return {
    status: 401,
    requestError: error,
  };
}

function resourceNotFoundErrorMsg(error) {
  return {
    status: 404,
    requestError: error,
  };
}

// Response should have everything but status field
function normalResponse(response) {
  return {
    status: 200,
    ...response,
  };
}

*/

const statusCodes = {
  INTERNAL_SERVER_ERROR: 500,
  NORMAL: 200,
  INVALID_REQUEST: 400,
  NO_AUTHORIZATION: 401,
  RESOURCE_NOT_FOUND: 404,
  FORBIDDEN: 403,
};

//Impure, sents a response
function responseHandler(httpRes, respObject) {
  //It is expected that response handler is always given an object with status field

  log("respObject :", respObject);
  if (respObject.status == null) {
    const e = new Error();
    log("Error stack :", e.stack);
    // console.log("Error stack:", e.stack);

    httpRes.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      requestError:
        "Unexpected error while processing the request, please contact support",
    });
  } else {
    httpRes.status(respObject.status).json(
      produce(respObject, (d) => {
        delete d.status;
      })
    );
  }
}

// module.exports = {
//   internalErrorMsg,
//   badRequestErrorMsg,
//   authorizationErrorMsg,
//   resourceNotFoundErrorMsg,
//   normalResponse,
//   responseHandler,
// };

module.exports = {
  statusCodes,
  responseHandler,
};
