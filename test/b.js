'use strict'

const assert = require('assert-plus')
const MysqlCache = require('../app')
const settings = require('../settings').settings()
let db

describe('Init Test Suite', function() {
    this.timeout(15000)

    it('Setup mysql-cache', done => {
        db = new MysqlCache(settings)

        db.event.on('connected', () => {
            done()
        })
    })
    it('disable cache, call query', done => {
        settings.caching = false
        db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql, mysqlCache) => {
            assert.equal(resultMysql[0].solution, 12)
            assert.equal(mysqlCache.isCache, false)
            done()
        })
    })
})
