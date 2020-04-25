const bm = require('./baseModel.js');

let conn  = global.db;
const log = global.log;

//Task object constructor
class Parameter extends bm.SIABaseModel {
    constructor(){
        super('parameters');
    }
};

module.exports = {Parameter};
