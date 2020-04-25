const bm = require('./baseModel.js');

let conn  = global.db;
const log = global.log;

//Task object constructor
class InvoiceLine extends bm.SIABaseModel {
    constructor(){
        super('invoice_lines');
    }
};

module.exports = {InvoiceLine};
