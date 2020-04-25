const tableRelations = new Map();

tableRelations.set ('invoices'
                , {
                            child: "invoice_lines"
                            ,parent_link : "id"
                            ,child_link:"inv_hdr_id"
                        }
                    );

module.exports = tableRelations;