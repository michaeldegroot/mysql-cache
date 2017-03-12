'use strict'

const assert = require('assert-plus')
const MysqlCache = require('../app')
const settings = require('../settings').settings()
let db

describe('Cache parameter suite', function() {
    this.timeout(15000)

    it('Setup mysql-cache', done => {
        db = new MysqlCache(settings)

        db.connectAsync().then(() => {
            done()
        })
    })
    it('Do not cache', done => {
        db.query({sql:'SELECT 6 + 6 AS solution', cache: false}, (err, resultMysql, cache) => {
            assert.equal(resultMysql[0].solution, 12)
            assert.equal(cache.isCache, false)
            done()
        })
    })
    it('Do not cache again', done => {
        db.query({sql:'SELECT 6 + 6 AS solution', cache: false}, (err, resultMysql, cache) => {
            assert.equal(resultMysql[0].solution, 12)
            assert.equal(cache.isCache, false)
            done()
        })
    })
    it('Do cache (should be not cached)', done => {
        db.query({sql:'SELECT 6 + 6 AS solution', cache: true}, (err, resultMysql, cache) => {
            assert.equal(resultMysql[0].solution, 12)
            assert.equal(cache.isCache, false)
            done()
        })
    })
    it('Do cache (should be cached)', done => {
        db.query({sql:'SELECT 6 + 6 AS solution', cache: true}, (err, resultMysql, cache) => {
            assert.equal(resultMysql[0].solution, 12)
            assert.equal(cache.isCache, true)
            done()
        })
    })
})
