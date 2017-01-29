'use strict'

const assert = require('assert-plus')
const appRoot  = require('app-root-path')
const db       = require(appRoot + '/app')
const settings = require(appRoot + '/settings').settings()

db.event.on('error', err => {
    throw new Error(err)
})

describe('Invalid Host Mysql Error Test Suite', function() {
    this.timeout(15000)
    it('Should error', done => {
        db.init({
            host: 'klappa',
            user: settings.user,
            password: settings.password,
            database: 'mysqlcache',
            TTL: 0, // Time To Live for a cache key in seconds (0 = infinite)
            connectionLimit: 100, // Mysql connection pool limit (increase value if you are having problems)
            verbose: false, // Do you want info and success messages about what the program is doing?
            caching: false, // Do you want to enable caching?
            cacheProvider: 'node-cache',
        }, (connected, err) => {
            assert.throws(() => {
                if (err) {
                    throw new Error(err)
                }
            })
            done()
        })
    })
})
