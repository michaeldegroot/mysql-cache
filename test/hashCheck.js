'use strict'

const assert   = require('assert-plus')
const appRoot  = require('app-root-path')
const db       = require(appRoot + '/app')
const crypto   = require('crypto')
const mysql    = require('mysql')
const settings = require(appRoot + '/settings').settings()

describe('Hash Check Suite', function() {
    this.timeout(15000)
    it('Call Init', () => {
        assert.doesNotThrow(() => {
            db.init(settings)
        }, Error)
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
        const params1        = [42, 41]
        const generatedSql1  = String(mysql.format(sql1, params1))
        const sql2           = 'SELECT ? + ? AS solution'
        const params2        = [42, 41]
        const generatedSql2  = String(mysql.format(sql2, params2))

        db.query(generatedSql1, (err1, resultMysql1, mysqlCache1) => {
            db.query(generatedSql2, (err2, resultMysql2, mysqlCache2) => {
                assert.equal(mysqlCache1.hash, mysqlCache2.hash)
                assert.equal(mysqlCache1.hash.length === 128, true)
                done()
            })
        })
    })

    it('Verify hash case-insensitive query', done => {
        const sql1          = 'SELECT ? + ? AS solution'
        const params1       = [15, 44]
        const generatedSql1 = String(mysql.format(sql1, params1))
        const sql2          = 'SelecT ? + ? As soLUTioN'
        const params2       = [15, 44]
        const generatedSql2 = String(mysql.format(sql2, params2))

        db.query(generatedSql1, (err1, resultMysql1, mysqlCache1) => {
            db.query(generatedSql2, (err2, resultMysql2, mysqlCache2) => {
                assert.equal(mysqlCache1.hash, mysqlCache2.hash)
                assert.equal(mysqlCache1.hash.length === 128, true)
                assert.equal(mysqlCache2.hash.length === 128, true)
                done()
            })
        })
    })

    it('Verify hash whitespace ignore query', done => {
        const sql1          = 'SELECT ? + ? AS solution'
        const params1       = [15, 44]
        const generatedSql1 = String(mysql.format(sql1, params1))
        const sql2          = 'SELECT             ?    +    ?    AS    solution'
        const params2       = [15, 44]
        const generatedSql2 = String(mysql.format(sql2, params2))

        db.query(generatedSql1, (err1, resultMysql1, mysqlCache1) => {
            db.query(generatedSql2, (err2, resultMysql2, mysqlCache2) => {
                assert.equal(mysqlCache1.hash, mysqlCache2.hash)
                assert.equal(mysqlCache1.hash.length === 128, true)
                assert.equal(mysqlCache2.hash.length === 128, true)
                done()
            })
        })
    })
})
