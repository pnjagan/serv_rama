const bm = require('./baseModel.js');

let conn  = global.db;
const log = global.log;

//Task object constructor
class Item extends bm.SIABaseModel {
    constructor(){
        super('items');
    }
};

module.exports = {Item};
