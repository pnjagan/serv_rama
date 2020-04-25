const bm = require('./baseModel.js');

let conn  = global.db;
const log = global.log;

//Task object constructor
class Invoice extends bm.SIABaseModel {
    constructor(){
        super('invoices');
    }
};

module.exports = {Invoice};
