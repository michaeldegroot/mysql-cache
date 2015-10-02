'use strict'

const assert = require('assert-plus')
const MysqlCache = require('../app')
const settings = require('../settings').settings()

describe('Cache parameter suite', function() {
    this.timeout(15000)

    it('Setup a caching mysql-cache', done => {
        settings.caching = true
        const db = new MysqlCache(settings)

        db.event.on('connected', () => {
            db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql, mysqlCache) => {
                assert.equal(resultMysql[0].solution, 12)
                assert.equal(mysqlCache.isCache, false)
                db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql, mysqlCache) => {
                    assert.equal(resultMysql[0].solution, 12)
                    assert.equal(mysqlCache.isCache, true)
                    done()
                })
            })
        })
    })

    it('Setup a non-caching mysql-cache', done => {
        settings.caching = false
        const db = new MysqlCache(settings)

        db.event.on('connected', () => {
            db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql, mysqlCache) => {
                assert.equal(resultMysql[0].solution, 12)
                assert.equal(mysqlCache.isCache, false)
                db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql, mysqlCache) => {
                    assert.equal(resultMysql[0].solution, 12)
                    assert.equal(mysqlCache.isCache, false)
                    done()
                })
            })
        })
    })
})
