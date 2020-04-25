
const buildBaseRouter = require('./baseRouter');

const Invoice  = require('../models/invoiceModel').Invoice;

const invoiceRouter = buildBaseRouter(new Invoice());


module.exports = invoiceRouter;
