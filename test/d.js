'use strict'

const assert = require('assert-plus')
const MysqlCache = require('../app')
const settings = require('../settings').settings()
let db

describe('Cache parameter suite', function() {
    this.timeout(15000)

    it('Setup mysql-cache', done => {
        db = new MysqlCache(settings)

        db.event.on('connected', () => {
            done()
        })
    })
    it('Do not cache', done => {
        db.query({sql:'SELECT 6 + 6 AS solution', cache: false}, (err, resultMysql, mysqlCache) => {
            assert.equal(resultMysql[0].solution, 12)
            assert.equal(mysqlCache.isCache, false)
            done()
        })
    })
    it('Do not cache again', done => {
        db.query({sql:'SELECT 6 + 6 AS solution', cache: false}, (err, resultMysql, mysqlCache) => {
            assert.equal(resultMysql[0].solution, 12)
            assert.equal(mysqlCache.isCache, false)
            done()
        })
    })
    it('Do cache (should be not cached)', done => {
        db.query({sql:'SELECT 6 + 6 AS solution', cache: true}, (err, resultMysql, mysqlCache) => {
            assert.equal(resultMysql[0].solution, 12)
            assert.equal(mysqlCache.isCache, false)
            done()
        })
    })
    it('Do cache (should be cached)', done => {
        db.query({sql:'SELECT 6 + 6 AS solution', cache: true}, (err, resultMysql, mysqlCache) => {
            assert.equal(resultMysql[0].solution, 12)
            assert.equal(mysqlCache.isCache, true)
            done()
        })
    })
})
