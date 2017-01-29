'use strict'

const assert   = require('assert-plus')
const appRoot  = require('app-root-path')
let db         = require(appRoot + '/app')
const settings = require(appRoot + '/settings').settings()
const async    = require('async')
const mysql    = require('mysql')
const crypto   = require('crypto')
const decache  = require('decache')

const cacheProviders = db.cacheProviders

db.event.on('error', err => {
    throw new Error(err)
})

describe('main cache provider suite', function() {
    this.timeout(15000)
    it('Start ' + cacheProviders.length + ' cacheProviders', done => {
        async.each(cacheProviders, cacheProvider => {
            doRun(cacheProvider)
        })
        done()
    })
})

const doRun = (provider, cb) => {
    if (/^win/.test(process.platform) && provider === 'mmap') {
        return
    }
    describe(provider + ' cacheProvider', function() {
        this.timeout(15000)
        it('Call Init', () => {
            decache(appRoot + '/app')
            db = require(appRoot + '/app')
            settings.cacheProvider = provider
            assert.doesNotThrow(() => {
                db.init(settings)
            }, Error)
        })

        it('Flush', done => {
            db.flush()
            setTimeout(done, 100) // Flush is not a async function but just in case :P
        })

        it('Call a query', done => {
            db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql) => {
                assert.equal(resultMysql[0].solution, 6)
                done()
            })
        })

        it('Call a query again (cache hit)', done => {
            db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql, mysqlCache) => {
                assert.equal(resultMysql[0].solution, 6)
                assert.equal(mysqlCache.isCache, true)
                done()
            })
        })

        it('Call a new query', done => {
            db.query('SELECT ? + ? AS solution', [5, 55], (err, resultMysql, mysqlCache) => {
                assert.equal(mysqlCache.isCache, false)
                assert.equal(resultMysql[0].solution, 60)
                done()
            })
        })

        it('Call a query again (no cache hit)', done => {
            db.caching = false
            db.query('SELECT ? + ? AS solution', [5, 55], (err, resultMysql, mysqlCache) => {
                assert.equal(resultMysql[0].solution, 60)
                assert.equal(mysqlCache.isCache, false)
                db.caching = true
                done()
            })
        })

        it('Delete a key', () => {
            db.delKey('SELECT ? + ? AS solution', [1, 5])
        })

        it('Call a INSERT query', done => {
            db.query('insert into test set ?', {
                name: 1337,
            }, (err, resultMysql) => {
                assert.equal(err, null)
                done()
            })
        })

        it('Delete the inserted row', () => {
            db.query('delete from test where name = ?', [1337], (err, resultMysql) => {
                assert.equal(resultMysql.affectedRows, 1)
            })
        })

        it('Verify hash', done => {
            const sql           = 'SELECT ? + ? AS solution'
            const params        = [55, 44]
            const generatedSql  = String(mysql.format(sql, params))
            const generatedHash = crypto.createHash('sha512').update(db.createId(generatedSql)).digest('hex')

            db.query(generatedSql, (err, resultMysql, mysqlCache) => {
                assert.equal(mysqlCache.hash, generatedHash)
                assert.equal(mysqlCache.hash.length === 128, true)
                done()
            })
        })

        it('Verify hash of 2 identical queries', done => {
            const sql1           = 'SELECT ? + ? AS solution'
            const params1        = [9, 1]
            const generatedSql1  = String(mysql.format(sql1, params1))
            const sql2           = 'SELECT ? + ? AS solution'
            const params2        = [9, 1]
            const generatedSql2  = String(mysql.format(sql2, params2))

            db.query(generatedSql1, (err1, resultMysql1, mysqlCache1) => {
                db.query(generatedSql2, (err2, resultMysql2, mysqlCache2) => {
                    assert.equal(resultMysql1[0].solution === resultMysql2[0].solution, true)
                    assert.equal(resultMysql1[0].solution, 10)
                    assert.equal(mysqlCache1.hash, mysqlCache2.hash)
                    assert.equal(mysqlCache1.hash.length === 128, true)
                    done()
                })
            })
        })

        it('Verify hash case-insensitive query', done => {
            const sql1          = 'SELECT ? + ? AS solution'
            const params1       = [2, 8]
            const generatedSql1 = String(mysql.format(sql1, params1))
            const sql2          = 'SelecT ? + ? As soLUTioN'
            const params2       = [2, 8]
            const generatedSql2 = String(mysql.format(sql2, params2))

            db.query(generatedSql1, (err1, resultMysql1, mysqlCache1) => {
                db.query(generatedSql2, (err2, resultMysql2, mysqlCache2) => {
                    assert.equal(resultMysql1[0].solution === resultMysql2[0].solution, true)
                    assert.equal(resultMysql1[0].solution, 10)
                    assert.equal(mysqlCache1.hash, mysqlCache2.hash)
                    assert.equal(mysqlCache1.hash.length === 128, true)
                    assert.equal(mysqlCache2.hash.length === 128, true)
                    done()
                })
            })
        })

        it('Verify hash whitespace ignore query', done => {
            const sql1          = 'SELECT ? + ? AS solution'
            const params1       = [6, 4]
            const generatedSql1 = String(mysql.format(sql1, params1))
            const sql2          = 'SELECT             ?    +    ?    AS    solution'
            const params2       = [6, 4]
            const generatedSql2 = String(mysql.format(sql2, params2))

            db.query(generatedSql1, (err1, resultMysql1, mysqlCache1) => {
                db.query(generatedSql2, (err2, resultMysql2, mysqlCache2) => {
                    assert.equal(resultMysql1[0].solution === resultMysql2[0].solution, true)
                    assert.equal(resultMysql1[0].solution, 10)
                    assert.equal(mysqlCache1.hash, mysqlCache2.hash)
                    assert.equal(mysqlCache1.hash.length === 128, true)
                    assert.equal(mysqlCache2.hash.length === 128, true)
                    done()
                })
            })
        })
    })
}
