/* Immer does exactly what doc updated does, only much BETTER */
//function docPropUpdater(prop, doc, ignoreFields, copyAllFields) {
// const winston = require("../../config/winston");

const log = global.log;
const errLog = global.errLog;
//no use export - just a place holder

const { produce } = require("immer");

/*

{
  status : "This field will be sent by the model but stripped off by the router before forwarding - 200/400/401/404/500"
  result : {
   // reflect back columns 
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

/* Response should have everything but status field*/
function normalResponse(response) {
  return {
    status: 200,
    ...response,
  };
}

//Impure, sents a response
function responseHandler(httpRes, respObject) {
  if (respObject.status == null) {
    httpRes.status(500).json({
      REQUEST_ERROR:
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

module.exports = {
  internalErrorMsg,
  badRequestErrorMsg,
  authorizationErrorMsg,
  resourceNotFoundErrorMsg,
  normalResponse,
  responseHandler,
};
