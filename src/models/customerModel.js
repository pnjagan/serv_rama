const bm = require('./baseModel.js');

let conn  = global.db;
const log = global.log;

//Task object constructor
class Customer extends bm.SIABaseModel {
    constructor(){
        super('customers');
    }
};

module.exports = {Customer};
