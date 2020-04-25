
const winston = require('../../config/winston');
const util = require('util');

const snakeCaseKeys = require('snakecase-keys');
const camelcaseKeys = require('camelcase-keys');

const {snakeCase} = require('snake-case');
const camelCase = require('camelcase');

const tableRelations = require('./table_relations');


let conn  = global.db;
const log = global.log;


/*


Implement TRansaction SUPPORT
---------------------------------
  options.sql = 'ROLLBACK';
  connection.query(options, callback);
  ROLLBACK, COMMIT , "START TRANSACTION"
  TRansactions are  implemented as SQL query to DB
-------------------------------------------
Parent-child supported in getALL, create , delete,getById and update

TO-DO:
Relationship can be supported multi-level if object relation ship is captured instead of at table level.
It is easy, only constructor objects to be stored in the MAP

MySQL driver supports connection pooling - not used right.
It is possible to get a connection the pool dedicated for 1 tranasaction.
connection.release(); // will free a connection taken from the Pool for re-use.
CANNOT use pool.query as it will release a connection after a query, need to retain it to complete a transaction.
So, will write a wrapper on connection - Later :-)

use the template string function to improve the log.
we can inspect passed in values and if objects , we can automatically do util.inspect()

*/

function startTransaction(conn) {
    return new Promise(
        (res,rej) => {
            conn.query({sql:'START TRANSACTION',value:null}, function (error) {
                if(!error) {
                    log('trxn started');
                    res('trxn started');
                } else{
                    log('trxn could not be started');
                    rej('trxn could not be started');
                }
            })
    });
}

function commitTransaction(conn,retValue) {
    return new Promise(
        (res,rej) => {
            conn.query({sql:'COMMIT',value:null}, function (error) {
                if(!error) {
                    log('COMMIT is success');
                    res(retValue);
                } else{
                    log('COMMIT failed');
                    rej('trxn could not be committed');
                }
            })
    })
}

function rollbackTransaction(conn,retValue) {
    return new Promise(
        (res,rej) => {
            conn.query({sql:'ROLLBACK',value:null}, function (error) {
                if(!error) {
                    log('rollback success, but since overall operation failed , failing with error message from trxn');
                    rej(retValue);
                } else{
                    log('Rollback failed');
                    rej('trxn could not be Rolled back');
                }
            })
    })
}


//Task object constructor
class SIABaseModel   {
    constructor(tableName) {
        this.tableName = tableName;
        if(tableRelations.has(tableName)){
            this.hasChild    = true;
            this.childTable  = tableRelations.get(tableName).child;
            this.parent_link = tableRelations.get(tableName).parent_link;
            this.child_link  = tableRelations.get(tableName).child_link;            
        }else {
            this.hasChild    = false;
            this.childTable  = null;
            this.parent_link = null;
            this.child_link  = null;
        }

    }

    ///////////////////////
    getAll = () => {
        return this.getByAttribute('1','1');
    }
    


    //////////////////////////////////
    create = (newSIABaseModel) => {
        // log(util.inspect(newSIABaseModel));
        // log(util.inspect(conn));

        let modelRef = this;
        let newSIABaseModelP = JSON.parse(JSON.stringify(newSIABaseModel));
   
        if( this.hasChild ) { 
            delete newSIABaseModelP[camelCase(modelRef.childTable)];
        }  

        let finalP = null;

        let mainP = startTransaction(conn).then(
            trxnstart => {
                //INSERT of header
                log('TRx started, getting to next stage :'+trxnstart);
                return new Promise( function(res, rej){
                    conn.query(
                            `INSERT INTO ${modelRef.tableName} 
                            set ?`, snakeCaseKeys(newSIABaseModelP
                            ), function (err, result) {
                                if(err) {
                                    log('master insert failed'+err);
                                    rej(err);
                                }
                                else{
                                    log('master insert success');
                                    res( { result: result.insertId } );
                                }
                            }
                    );
                })
                //INSERT OF HEADER ENDS
            }
        )

        ////////ACTUAL INSERT


        if(! this.hasChild ){
            finalP = mainP;
        } else {
            finalP =  mainP.then (
                parentId => {
                    log('parent Id' + util.inspect(parentId));
                    return Promise.all(newSIABaseModel[camelCase(modelRef.childTable)].map(
                        (childRow) => {
                            let childRowM = {} 
                            Object.assign(childRowM,snakeCaseKeys(childRow), { [modelRef.child_link]: parentId.result});

                            return new Promise(
                                function (res,rej) {
                                    conn.query(
                                        `INSERT INTO ${modelRef.childTable} 
                                        set ?`, childRowM
                                                , function (err, result) {
                                                    if(err) {
                                                        rej(err);
                                                    }
                                                    else{
                                                        res( { result: result.insertId } );
                                                    }
                                                }
                                    );                                   
                                }
                            )
                        }
                    )
                )
                }
            )
        }
        //ACTUAL INSERT END


        return finalP.then(
            result => {
                log('insert operation success, tryng to commit ' + util.inspect(result));
                return commitTransaction(conn,result);
            } , insertErr => {
                log('insert operation failed, trying to rollback');
                return rollbackTransaction(conn,insertErr);
            }
        );
          
    }

    ////////////////////////////////////
    getById  = (id) => {
        return this.getByAttribute('id',id);
    }

    //////////////////////////////////
    deleteById  = (id) => {
        let modelRef = this;
        let finalP = null;        

        let mainP = startTransaction(conn).then(
            startTrx => {
                return  new Promise(function(res, rej){
                    conn.query(`delete from ${modelRef.tableName} where id = ?`, [id], function (err, result, fields) {
                        if(err) {
                            rej(err);
                        }
                        else{
                            res( camelcaseKeys(result) );
                        }
                    });
                })
            }
        );
        

        
        if(! modelRef.hasChild ){
            finalP =  mainP;
        } else {
            let finalP =          
                mainP.then(
                (deleteOutput) => {
                    return new Promise( function (res_2, rej_2) {
                        conn.query(`delete from ${modelRef.childTable} where ${modelRef.child_link} = ?`, [id], function (err, result, fields) {
                            if(err) {
                                rej_2(err);
                            }
                            else{
                                res_2( camelcaseKeys(result) );
                            }
                        });
                    }
                  )
                }
            );

            return finalP.then(
                result => {
                    log('delete operation success, tryng to commit ' + util.inspect(result));
                    return commitTransaction(conn,result);
                } , insertErr => {
                    log('delete operation failed, trying to rollback');
                    return rollbackTransaction(conn,insertErr);
                }
            );
        }
    }

    ////////////////////////////////
    updateById = (id , modifiedSIABaseModel) =>{

        let modelRef = this;
        let modifiedSIABaseModelP = JSON.parse(JSON.stringify(modifiedSIABaseModel));
   
        if( this.hasChild ) { 
            delete modifiedSIABaseModelP[camelCase(modelRef.childTable)];
            delete modifiedSIABaseModelP.id;
        }  

        let finalP = null;

        let mainP = startTransaction(conn).then(
            trxnstart => {
                //Update of header
                log('TRx started, getting to next stage :'+trxnstart);
                return new Promise(function(res, rej){
                    conn.query(`update ${modelRef.tableName} set ? where id = ?`
                                , [snakeCaseKeys(modifiedSIABaseModelP),id]
                                , function (err, result, fields) {
                                    if(err) {
                                        rej(err);
                                    }
                                    else{
                                        res( camelcaseKeys(result) );
                                    }
                                }
                            );
                })
                //Update OF HEADER ENDS
            }
        )

       /////Child process
/*
Sample child table array element:

Modes : 
    update -> behaves like header, update columns available. id should be there
    insert -> behaves like NEW, creates a child record. id should NOT be there. will remove if there before sending.
    delete -> behaves like delete, looks for the id in data and deletes it from the table

        {   
            "mode":"update",
            "data":{
                "id": 1,
                "invHdrId": 1,
                "itemCode": "RAM",
                "itemDesc": "Ram item",
                "qty": 1,
                "price": 50
            }
        }

*/

        if(! this.hasChild ){
            finalP = mainP;
        } else {
            finalP =  mainP.then (
                updateRes => {
                    log('parent Id' + util.inspect(id));
                    return Promise.all(modifiedSIABaseModel [camelCase(modelRef.childTable)].map(
                        (childRowWrap) => {

                            let childRowM       = {};
                            let childRowData    = childRowWrap.data; 
                            let childMode       = childRowWrap.mode;

                            log('snakecase child_link' + snakeCase(modelRef.child_link));

                            Object.assign(
                                childRowM
                                , snakeCaseKeys(childRowData)
                                , { [snakeCase(modelRef.child_link)]: id}
                            );

                            log('childRowM :'+util.inspect(childRowM));


                            return new Promise(
                                function (res,rej) {

                                    //Switch condition to be revised for modes
                                    switch(childMode) {
                                        //Update case
                                        case 'update' : {

                                            let rowForUpdate = JSON.parse(JSON.stringify(childRowM));
                                            delete rowForUpdate.id;

                                            log('Data to update'+util.inspect(rowForUpdate));

                                            conn.query(
                                                `UPDATE ${modelRef.childTable} 
                                                set ? where id =?`, [rowForUpdate,childRowData.id]
                                                        , function (err, result) {
                                                            if(err) {
                                                                rej(err);
                                                            }
                                                            else{
                                                                res(  camelcaseKeys(result)  );
                                                            }
                                                        }
                                            );
                                            break;
                                        }

                                        //insert case
                                        case 'insert' : {

                                            let rowForInsert = JSON.parse(JSON.stringify(childRowM));
                                            delete rowForInsert.id;
                                            log('Data to INSERT'+util.inspect(rowForInsert));                                            

                                            conn.query(
                                                `INSERT INTO ${modelRef.childTable} 
                                                set ?`, rowForInsert
                                                        , function (err, result) {
                                                            if(err) {
                                                                rej(err);
                                                            }
                                                            else{
                                                                res( { result: result.insertId } );
                                                            }
                                                        }
                                            );
                                            break;
                                        }
                                        
                                        //delete case
                                        case 'delete' : {
                                            conn.query(
                                                `DELETE FROM ${modelRef.childTable} 
                                                where id = ?`, [childRowData.id]
                                                        , function (err, result) {
                                                            if(err) {
                                                                rej(err);
                                                            }
                                                            else{
                                                                res( camelcaseKeys(result) );
                                                            }
                                                        }
                                            );
                                            break;
                                        }      
                                        
                                        //delete case
                                        default : {
                                            rej('Unsupported mode for update of child record');
                                            break;
                                        }    
                                        
                                        //////
                                    }//Switch ENDS
                                  
                                }
                            )
                        }// MAP of wrapped CHILD ends
                    )// MAP of wrapped CHILD ends
                )//Promise ALL
                }// then on mainP
            )// then on mainP
        }//Has CHild else
        //ACTUAL INSERT END


        return finalP.then(
            result => {
                log('update operation success, tryng to commit ' + util.inspect(result));
                return commitTransaction(conn,result);
            } , updateErr => {
                log('update operation failed, trying to rollback');
                return rollbackTransaction(conn,updateErr);
            }
        );        

        /*
        return new Promise(function(res, rej){
            conn.query(`update ${modelRef.tableName} set ? where id = ?`
                        , [snakeCaseKeys(modifiedSIABaseModel),id]
                        , function (err, result, fields) {
                            if(err) {
                                rej(err);
                            }
                            else{
                                res( camelcaseKeys(result) );
                            }
                        }
                    );
        });
        */
    }

    /////////////get by attribute///////////////////////
    getByAttribute  = (attribName,attribValue) => {


       // log(`Table name in getAll is ${}`);
        //let tn = this.tableName;
        let modelRef = this;

        let mainP = new Promise( function(res, rej){
            conn.query(`select * from ${modelRef.tableName} where ${attribName} = ?`, [attribValue], function (err, result, fields) {
                if(err) {
                    rej(err);
                }
                else{
                    res( camelcaseKeys(result) );
                }
            });
        } );



        if(! this.hasChild ) { 
            return mainP; 
        } else {
            return mainP.then(
                parentRows => {
                    return Promise.all(
                        parentRows.map((cv,ind) => { 
                            return new Promise(function(res, rej){
                                conn.query(`select * from ${modelRef.childTable} 
                                            where ${modelRef.child_link} = ?`
                                            , [cv[modelRef.parent_link]]
                                            , function (err, childRows, fields) {
                                                    if(err) {
                                                        rej(err);
                                                    }
                                                    else{
                                        
                                                        res( 
                                                            {
                                                                ...cv
                                                                ,[camelCase(modelRef.childTable)] : camelcaseKeys(childRows)
                                                            } 
                                                        );
                                                    }
                                              }
                                        );
                                }
                            );
                        } //returns a Promise that expands a row
                        ) //map ends
                ) // the array of Promise is wrapped inside another Promise
            } 
            // , ( err) => {/* Error of main record fetch */}
        );
        }
    }    

};



module.exports = { SIABaseModel};
