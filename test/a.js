'use strict'

const assert     = require('assert-plus')
const MysqlCache = require('../app')
const settings   = require('../settings').settings()

let db

describe('Main Application Suite', function() {
    this.timeout(15000)

    it('Setup mysql-cache', done => {
        db = new MysqlCache(settings)

        db.connectAsync().then(() => {
            done()
        })
    })

    it('Show stats', () => {
        db.stats()
    })

    it('Call invalid cacheprovider action', () => {
        assert.throws(() => {
            db.cacheProvider.run()
        }, Error)
    })

    it('Call a query', done => {
        db.query('SELECT ? + ? AS solution', [1, 5], (err, res, cache) => {
            assert.equal(res[0].solution, 6)
            setTimeout(() => {
                assert.equal(db.queries, 1)
                assert.equal(db.misses, 1)
                assert.equal(db.hits, 0)
                assert.equal(db.stats(true).poolConnections, 1)
                done()
            }, 100)
        })
    })

    it('Call a query without params', done => {
        db.query('SELECT 1 + 1 AS solution', (err, resultMysql) => {
            assert.equal(resultMysql[0].solution, 2)
            setTimeout(() => {
                assert.equal(db.queries, 2)
                assert.equal(db.misses, 2)
                assert.equal(db.hits, 0)
                assert.equal(db.stats(true).poolConnections, 1)
                done()
            }, 100)
        })
    })

    it('Call a INSERT query', done => {
        db.query('insert into test set ?', {
            name: 1337,
        }, (err, res) => {
            if (err) {
                throw err
            }
            assert.equal(res.affectedRows, 1)
            setTimeout(() => {
                assert.equal(db.queries, 3)
                assert.equal(db.misses, 2)
                assert.equal(db.hits, 0)
                assert.equal(db.stats(true).poolConnections, 1)
                done()
            }, 100)
        })
    })

    it('Delete the inserted row', done => {
        db.query('delete from test where name = ?', ['1337'], (err, resultMysql) => {
            if (err) {
                throw err
            }
            assert.equal(resultMysql.affectedRows, 1)
            setTimeout(() => {
                assert.equal(db.queries, 4)
                assert.equal(db.misses, 2)
                assert.equal(db.hits, 0)
                assert.equal(db.stats(true).poolConnections, 1)
                done()
            }, 100)
        })
    })

    it('Call a query as sql object', done => {
        db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
            if (err) {
                throw err
            }
            assert.equal(resultMysql[0].solution, 12)
            setTimeout(() => {
                assert.equal(db.queries, 5)
                assert.equal(db.misses, 3)
                assert.equal(db.hits, 0)
                assert.equal(db.stats(true).poolConnections, 1)
                done()
            }, 100)
        })
    })

    it('Call a query without a callback', done => {
        db.query({sql:'SELECT 6 + 6 AS solution'})
        setTimeout(() => {
            assert.equal(db.queries, 6)
            assert.equal(db.misses, 3)
            assert.equal(db.hits, 1)
            assert.equal(db.stats(true).poolConnections, 1)
            done()
        }, 100)
    })

    it('Test cache', done => {
        db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql, cache) => {
            assert.equal(resultMysql[0].solution, 6)
            assert.equal(cache.isCache, true)
            setTimeout(() => {
                assert.equal(db.queries, 7)
                assert.equal(db.misses, 3)
                assert.equal(db.hits, 2)
                assert.equal(db.stats(true).poolConnections, 1)
                done()
            }, 100)
        })
    })

    it('Delete a key', done => {
        db.delKey('SELECT ? + ? AS solution', [1, 5], err => {
            assert.equal(err, undefined)
            assert.equal(db.queries, 7)
            assert.equal(db.misses, 3)
            assert.equal(db.hits, 2)
            assert.equal(db.stats(true).poolConnections, 1)
            done()
        })
    })

    it('Test trace', () => {
        db.verbose = true
        db.trace('test')
        db.verbose = false
    })

    it('Test error', () => {
        assert.throws(() => {
            throw db.error('test')
        }, Error)
    })

    it('Delete a key version 2', done => {
        db.delKey({sql:'SELECT ? + ? AS solution', params: [1, 5]}, err => {
            assert.equal(err, undefined)
            assert.equal(db.queries, 7)
            assert.equal(db.misses, 3)
            assert.equal(db.hits, 2)
            assert.equal(db.stats(true).poolConnections, 1)

            done()
        })
    })

    it('One time setting per query', done => {
        db.query('SELECT ? + ? AS solution', [10, 5], (err, resultMysql) => {
            assert.equal(resultMysql[0].solution, 15)
            setTimeout(() => {
                assert.equal(db.queries, 8)
                assert.equal(db.misses, 4)
                assert.equal(db.hits, 2)
                assert.equal(db.stats(true).poolConnections, 1)
                done()
            }, 100)
        }, {cache:false, TTL:600})
    })

    it('Flush all cache', done => {
        db.flush(err => {
            assert.equal(err, undefined)

            done()
        })
    })

    it('Flush all cache (compatiblity)', done => {
        db.flushAll(err => {
            assert.equal(err, undefined)

            done()
        })
    })

    it('Change TTL', () => {
        assert.doesNotThrow(() => {
            db.TTL = 60
        }, Error)
    })
})
