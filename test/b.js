'use strict'

const assert = require('assert-plus')
const db       = require('../app')
const settings = require('../settings').settings()

db.event.on('error', err => {
    throw new Error(err)
})

describe('Init Test Suite', function() {
    this.timeout(15000)
    it('Call init, disable cache, call query', done => {
        settings.caching = false
        db.init(settings)
        db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql, mysqlCache) => {
            assert.equal(resultMysql[0].solution, 12)
            assert.equal(mysqlCache.isCache, false)
            done()
        })
    })
})
