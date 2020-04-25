const bm = require('./baseModel.js');

let conn  = global.db;
const log = global.log;

//Task object constructor
class User extends bm.SIABaseModel {
    constructor(){
        super('users');
    }
};

module.exports = {User};
