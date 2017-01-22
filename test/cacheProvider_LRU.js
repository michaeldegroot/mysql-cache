'use strict'

const assert = require('assert-plus')
const appRoot  = require('app-root-path')
const db       = require(appRoot + '/app')
const settings = require(appRoot + '/settings/settings').settings()

settings.cacheProvider = 'LRU'

describe(settings.cacheProvider + ' cacheProvider', function() {
    this.timeout(15000)
    it('Call Init', () => {
        assert.doesNotThrow(() => {
            db.init(settings)
            db.flushAll()
        }, Error)
    })

    it('Call a query', done => {
        db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql) => {
            assert.equal(resultMysql[0].solution, 6)
            done()
        })
    })

    it('Call a query again (cache hit)', done => {
        db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql) => {
            assert.equal(resultMysql[0].solution, 6)
            done()
        })
    })

    it('Delete a key', () => {
        db.delKey('SELECT ? + ? AS solution', [1, 5])
    })
})
