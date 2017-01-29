'use strict'

const colors     = require('colors')
const appRoot    = require('app-root-path')
const db         = require(appRoot + '/app')
const mysql      = require('mysql')

exports.doCallback = (cb, a, b, c, d, e, f, g) => {
    if (typeof cb === 'function') {
        cb(a, b, c, d, e, f, g)
    } else {
        return false
    }
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

        // If there are no listeners, just throw the error
        if (db.event.listeners('error').length <= 0) {
            throw new Error(err)
        }

        db.event.emit('error', err)
    }
}
