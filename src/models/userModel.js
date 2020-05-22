const { buildBaseModel } = require("./baseModel");

let conn = global.db;
const log = global.log;

module.exports = { userModel: buildBaseModel("users") };
