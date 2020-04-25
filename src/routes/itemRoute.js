
const buildBaseRouter = require('./baseRouter');

const Item  = require('../models/itemModel').Item;

const itemRouter =buildBaseRouter(new Item());


module.exports = itemRouter;
