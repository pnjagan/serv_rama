const { buildBaseModel } = require("./baseModel");

const conn = require("../common/dbconn").db;
const { log } = require("../../config/winston");

module.exports = { userModel: buildBaseModel("users") };
