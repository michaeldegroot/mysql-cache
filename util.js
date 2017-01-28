'use strict'

const colors     = require('colors')
const appRoot    = require('app-root-path')
const db         = require(appRoot + '/app')
const mysql      = require('mysql')

exports.doCallback = (cb, args) => {
    if (typeof cb === 'function') {
        cb(args)
    } else {
        return false
    }
}

exports.getStackTrace = () => {
    const obj = {}

    Error.captureStackTrace(obj)

    return obj.stack
}

exports.trace = text => {
    if (exports.verboseMode) {
        console.log(colors.green('MYSQL-CACHE') + ': ' + text)
    }
}

exports.error = (err, sql) => {
    if (err) {
        if (sql) {
            if (sql.hasOwnProperty('sql')) {
                sql = mysql.format(sql.sql, sql.params)
            }
            err = 'QUERY FAILURE: ' + sql + '\n' + err
        }
        db.event.emit('error', err)
    }
}
