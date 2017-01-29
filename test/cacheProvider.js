'use strict'

const assert   = require('assert-plus')
const appRoot  = require('app-root-path')
let db         = require(appRoot + '/app')
const settings = require(appRoot + '/settings').settings()
const async    = require('async')
const decache  = require('decache')

const cacheProviders = db.cacheProviders

describe('main cache provider suite', function() {
    this.timeout(15000)
    it('Start ' + cacheProviders.length + ' cacheProviders', done => {
        async.each(cacheProviders, function(cacheProvider, callback) {
            doRun(cacheProvider, () => {
                callback()
            })
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

        it('Delete a key', () => {
            db.delKey('SELECT ? + ? AS solution', [1, 5])
            cb()
        })
    })
}
