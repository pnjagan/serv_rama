
const buildBaseRouter = require('./baseRouter');

const Parameter  = require('../models/paramModel').Parameter;

let paramRouter = buildBaseRouter(new Parameter());


module.exports = paramRouter;