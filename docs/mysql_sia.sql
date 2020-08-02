use dev_sia;


drop table invoices;

create table invoices (
id  INT PRIMARY KEY AUTO_INCREMENT
/* ------------------------------- */
,shipto_cust_id INT
,shipto_cust_num VARCHAR(100)
,shipto_name    VARCHAR(200)
,shipto_addr1   VARCHAR(200)
,shipto_addr2   VARCHAR(200)
,shipto_addr3   VARCHAR(200)
,shipto_tax_num VARCHAR(100)
/* ------------------------------- */
,billto_cust_id INT
,billto_cust_num VARCHAR(100)
,billto_name    VARCHAR(200)
,billto_tax_num VARCHAR(100)
/* ------------------------------- */
,byr_po      VARCHAR(100)
,byr_po_date DATE
/* ------------------------------- */
,inv_num     VARCHAR(100)
,inv_date    DATE
,inv_issue_date DATE
/* ------------------------------- */
,goods_ship_date DATE
,ship_mode      VARCHAR(100)
,shipper        VARCHAR(100)
,shipment_ref   VARCHAR(100)
/* ------------------------------- */
,GST      FLOAT
,frieght  FLOAT
,other_charges   FLOAT
 /* ------------------------------- */
,line_total       FLOAT
,grand_total      FLOAT
 /* ------------------------------- */
,attribute1       VARCHAR(1000)
,attribute2       VARCHAR(1000)
,attribute3       VARCHAR(1000)
,attribute4       VARCHAR(1000)
,attribute5       VARCHAR(1000)
 /* ------------------------------- */
,inv_status       VARCHAR(100)
);

/* 
-- insert into invoices (inv_num, rcv_name,total_amort ) values ('INV#100', 'Super suppliers', 200.0);
*/

drop table invoice_lines;

create table invoice_lines (
id  INT PRIMARY KEY AUTO_INCREMENT
,inv_hdr_id  INT
,item_id     INT
,item_code   VARCHAR(100)
,item_desc   VARCHAR(200)
,uom         VARCHAR(200)
,pack        VARCHAR(200)
,qty         FLOAT
,price       FLOAT
,attribute1  VARCHAR(1000)
,attribute2  VARCHAR(1000)
,attribute3  VARCHAR(1000)
,attribute4  VARCHAR(1000)
,attribute5  VARCHAR(1000)
);

/*
-- insert into invoice_lines (inv_hdr_id, item_id ,item_code , item_desc ,qty , price) values (1, 1, 'RAM' , 'Ram item', 1 , 50);
-- insert into invoice_lines (inv_hdr_id, item_id , item_code , item_desc ,qty , price) values (1, 2, 'KRISHNA' , 'Sri Krishna', 1 , 50);
-- insert into invoice_lines (inv_hdr_id, item_id , item_code , item_desc ,qty , price) values (1, 3, 'GOVINDA' , 'Sri Govinda', 1 , 50);
------------------------------------------------------------------------------
*/

drop table parameters;

CREATE TABLE parameters(
id INT PRIMARY KEY AUTO_INCREMENT
,parameter_name   VARCHAR(100) NOT NULL UNIQUE
,parameter_value  VARCHAR(2000)
);

/*
-- insert into parameters (parameter_name,parameter_value) VALUES('INV_NUM_SEQ','100');
-- insert into parameters (parameter_name,parameter_value) VALUES('INV_HDR_ID_SEQ','1');
-- insert into parameters (parameter_name,parameter_value) VALUES('INV_LINE_ID_SEQ','1');
-- insert into parameters (parameter_name,parameter_value) VALUES('CUST_ID_SEQ','1');
-- insert into parameters (parameter_name,parameter_value) VALUES('ITEM_ID_SEQ','1');
-- insert into parameters (parameter_name,parameter_value) VALUES('PARAM_ID_SEQ','1');
-- insert into parameters (parameter_name,parameter_value) VALUES('USER_ID_SEQ','1');
-- insert into parameters (parameter_name,parameter_value) VALUES('PACK','100X100<>1X1<>NA');
-- insert into parameters (parameter_name,parameter_value) VALUES('UNIT','NOS<>KG');
-- insert into parameters (parameter_name,parameter_value) VALUES('TAXRATE','4');
*/

/*
-- Dont drop users everytime
-- drop table users;
*/

CREATE TABLE users(
id           INT PRIMARY KEY  AUTO_INCREMENT
,user_login       varchar(100) NOT NULL UNIQUE
,user_name        varchar(100)
,user_password    varchar(100)
,user_hash    varchar(100) NOT NULL
,enabled_flag     varchar(1) 
,responsibility   VARCHAR(100) 
);

/*
-- insert into users (id,user_login,user_password,user_hash,user_name,enabled_flag,responsibility) values (1,'admin','d033e22ae348aeb566fc214aec3585c4da997','a','Administrator','Y','ADMIN');
*/

DROP table items;

CREATE TABLE items(
 id INT PRIMARY KEY AUTO_INCREMENT
,item_code VARCHAR(100)
,item_desc VARCHAR(200)
,price     FLOAT
,attribute1  VARCHAR(1000)
,attribute2  VARCHAR(1000)
,attribute3  VARCHAR(1000)
,attribute4  VARCHAR(1000)
,attribute5  VARCHAR(1000)
);

drop table customers;

CREATE TABLE customers(
id INT PRIMARY KEY  AUTO_INCREMENT
,customer_num    VARCHAR(100)
,customer_name  VARCHAR(100)
,phone      VARCHAR(100)
,email      VARCHAR(100)
,address_line1 VARCHAR(100)
,address_line2 VARCHAR(100)
,address_line3 VARCHAR(100)
);

