
const buildBaseRouter = require('./baseRouter');

const Customer  = require('../models/customerModel').Customer;

const customerRouter = buildBaseRouter(new Customer());

module.exports = customerRouter;
