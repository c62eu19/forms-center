const express = require("express");
const sql = require("mssql");

function list(callback) {

    try {
        var sqlStmt = 
            "SELECT a.form_id, " +
             "a.title, " +
             "a.version, " +
             "a.status_cd, " +
             "a.bus_area_cd, " +
             "a.category_cd, " +
             "format(a.status_dt, 'MM-dd-yyyy') as status_dt, " +
             "b.descr as status_descr, " +
             "c.descr as bus_area_descr, " +
             "d.descr as category_descr " +
            "FROM forms.dbo.form a, " +
             "forms.dbo.status b, " +
             "forms.dbo.bus_area c, " +
             "forms.dbo.category d " +
            "WHERE (a.status_cd = b.status_cd) AND " +
             "(a.bus_area_cd = c.bus_area_cd) AND " +
             "(a.category_cd = d.category_cd) " +
            "ORDER BY a.title";

        var list = [];

        var con = sql.globalConnection;

        con.query(sqlStmt, function (err, result, fields) {
            if (err) throw err;

            result.recordset.forEach(row => {
                var data = {
                    "formId":row.form_id,
                    "title":row.title,
                    "version":row.version,
                    "statusCd":row.status_cd,
                    "busAreaCd":row.bus_area_cd,
                    "statusDt":row.status_dt,
                    "statusDescr":row.status_descr,
                    "busAreaDescr":row.bus_area_descr,
                    "categoryDescr":row.category_descr
                }
                list.push(data);
            });

            con.release();
            return callback(list);
        });

    } catch(err) {
        console.error("Error executing query:", err);
    }
}

async function get(formId, callback) {

    try {
        var sqlStmt = 
            "SELECT a.form_id, " +
             "a.title, " +
             "a.version, " +
             "a.status_cd, " +
             "a.bus_area_cd, " +
             "format(a.status_dt, 'MM-dd-yyyy') as status_dt, " +
             "a.descr, " +
             "b.descr as status_descr, " +
             "c.descr as bus_area_descr, " +
             "d.descr as category_descr " +
            "FROM forms.dbo.form a, " +
             "forms.dbo.status b, " +
             "forms.dbo.bus_area c, " +
             "forms.dbo.category d " +
            "WHERE (a.form_id = @formId) AND " +
             "(a.status_cd = b.status_cd) AND " +
             "(a.bus_area_cd = c.bus_area_cd) AND " +
             "(a.category_cd = d.category_cd)";

        var form = {};

        var con = sql.globalConnection;

        const result = await con.request()
            .input('formId', sql.VarChar, formId)
            .query(sqlStmt);

        result.recordset.forEach(row => {
            form = {
                "formId":row.form_id,
                "title":row.title,
                "version":row.version,
                "statusCd":row.status_cd,
                "busAreaCd":row.bus_area_cd,
                "statusDt":row.status_dt,
                "descr":row.descr,
                "statusDescr":row.status_descr,
                "busAreaDescr":row.bus_area_descr,
                "categoryDescr":row.category_descr,
                "statusCdList": global.statusCdList,
                "busAreaCdList": global.busAreaCdList,
                "categoryCdList": global.categoryCdList
            }
        });

        con.release();
        return callback(form);

    } catch(err) {
        console.error("Error executing query:", err);
    }
}

async function count(title, version, callback) {

    try {
        var sqlStmt = 
            "SELECT count(*) as row_count " +
            "FROM forms.dbo.form " +
            "WHERE (lower(title) = @title) AND " +
             "(lower(version) = @version)";

        var con = sql.globalConnection;

        var rowCount = 0;

        const result = await con.request()
            .input('title', sql.VarChar, title.trim().toLowerCase())
            .input('version', sql.VarChar, version.trim().toLowerCase())
            .query(sqlStmt);

        result.recordset.forEach(row => {
            rowCount = row.row_count;
        });

        con.release();
        return callback(rowCount);

    } catch(err) {
        console.error("Error executing query:", err);
    }
}

async function insert(form, callback) {

    try {
        var sqlStmt = 
            "INSERT forms.dbo.form (" +
             "title, " +
             "version, " +
             "status_cd, " +
             "bus_area_cd, " +
             "category_cd, " +
             "status_dt, " +
             "descr, " +
             "audit_cols) " +
            "VALUES (" +
             "@title, " +
             "@version, " +
             "@statusCd, " +
             "@busAreaCd, " +
             "@categoryCd, " +
             "@statusDt, " +
             "@descr, " +
             "@auditCols); " + " SELECT SCOPE_IDENTITY() as next_id";

        var con = sql.globalConnection;

        const result = await con.request()
            .input('title', sql.VarChar, form.title)
            .input('version', sql.VarChar, form.version)
            .input('statusCd', sql.VarChar, form.statusCd.toString())
            .input('busAreaCd', sql.VarChar, form.busAreaCd)
            .input('categoryCd', sql.VarChar, form.categoryCd)
            .input('statusDt', sql.VarChar, form.statusDt)
            .input('descr', sql.VarChar, form.descr)
            .input('auditCols', sql.VarChar, form.auditCols)
            .query(sqlStmt);

        let nextId = 0;
        result.recordset.forEach(row => {
            nextId = row.next_id;
        });

        con.release();
        return callback(nextId);

    } catch(err) {

        // Handle Dupe rows specifically
        if(err.number == 2627) {
            return callback(-1);  // Dupe row
        } else {
            console.error("Error executing query:", err);
            return callback(-2);  // All other SQL errs
        }
    }
}

async function update(form, callback) {

    try {
        var sqlStmt = 
            "UPDATE forms.dbo.form " +
             "SET title = @title, " +
             "version = @version, " +
             "status_cd = @statusCd, " +
             "bus_area_cd = @busAreaCd, " +
             "category_cd = @categoryCd, " +
             "status_dt = @statusDt, " +
             "descr = @descr, " +
             "audit_cols = @auditCols " +
            "WHERE (form_id = @formId)";

        var con = sql.globalConnection;

        const result = await con.request()
            .input('title', sql.VarChar, form.title)
            .input('version', sql.VarChar, form.version)
            .input('statusCd', sql.VarChar, form.statusCd)
            .input('busAreaCd', sql.VarChar, form.busAreaCd)
            .input('categoryCd', sql.VarChar, form.categoryCd)
            .input('statusDt', sql.VarChar, form.statusDt)
            .input('descr', sql.VarChar, form.descr)
            .input('auditCols', sql.VarChar, form.auditCols)
            .input('formId', sql.VarChar, form.formId.toString())
            .query(sqlStmt);

        con.release();
        return callback(0);

    } catch(err) {

        // Handle Dupe rows specifically
        if(err.number == 2627) {
            return callback(-1);  // Dupe row
        } else {
            console.error("Error executing query:", err);
            return callback(-2);  // All other SQL errs
        }
    }
}

module.exports = {
    list,
    get,
    count,
    insert,
    update
}
