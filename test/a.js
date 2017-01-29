'use strict'

const assert   = require('assert-plus')
const appRoot  = require('app-root-path')
const db       = require(appRoot + '/app')
const settings = require(appRoot + '/settings').settings()

db.event.on('error', err => {
    throw new Error(err)
})

describe('Main Application Suite', function() {
    this.timeout(15000)

    it('Call a query while init was not called yet', () => {
        assert.equal(db.cacheProvider.run('get', db.createId('test:D'), null, null), false)
    })

    it('Call Init', done => {
        assert.doesNotThrow(() => {
            db.init(settings, (connected, err) => {
                if (err) {
                    throw new Error(err)
                }
                assert.equal(connected, true)
                if (connected) {
                    done()
                }
            })
        }, Error)
    })

    it('Show stats', () => {
        db.stats()
    })

    it('Call invalid cacheprovider action', () => {
        assert.throws(() => {
            db.cacheProvider.run('thiswillneverexistsprobably', db.createId('test:D'), null, null)
        }, Error)
    })

    it('Call a query', done => {
        db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql) => {
            assert.equal(resultMysql[0].solution, 6)
            done()
        })
    })

    it('Call a query without params', done => {
        db.query('SELECT 1 + 1 AS solution', (err, resultMysql) => {
            assert.equal(resultMysql[0].solution, 2)
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

    it('Call a query as sql object', done => {
        db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
            assert.equal(resultMysql[0].solution, 12)
            done()
        })
    })

    it('Call a query without a callback', done => {
            db.query({sql:'SELECT 6 + 6 AS solution'})
            done()
    })

    it('Test cache', done => {
        db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql, mysqlCache) => {
            assert.equal(resultMysql[0].solution, 6)
            assert.equal(mysqlCache.isCache, true)
            done()
        })
    })

    it('Delete a key', () => {
        db.delKey('SELECT ? + ? AS solution', [1, 5])
    })

    it('Test trace', () => {
        db.util.verboseMode = true
        db.util.trace('test')
        db.util.verboseMode = false
    })

    it('Test error', done => {
        assert.throws(() => {
            db.util.error('test', {
                sql: 'test sql ?',
                params: ['woot'],
            })
        }, Error)
            done()
    })

    it('Delete a key version 2', () => {
        db.delKey({sql:'SELECT ? + ? AS solution', params: [1, 5]})
    })

    it('One time setting per query', done => {
        db.query('SELECT ? + ? AS solution', [10, 5], (err, resultMysql) => {
            assert.equal(resultMysql[0].solution, 15)
            done()
        }, {cache:false, TTL:600})
    })

    it('Flush all cache', () => {
        assert.doesNotThrow(() => {
            db.flushAll()
        }, Error)
    })

    it('Change DB', done => {
        db.changeDB({
            user:'root',
            pass: '',
            database: 'mysqlcache',
            charset:'utf8'
        }, err => {
            assert.doesNotThrow(() => {
                if (err) {
                    throw err
                }
                done()
            }, Error)
        })
    })

    it('Change TTL', () => {
        assert.doesNotThrow(() => {
            db.TTL = 60
        }, Error)
    })

    it('Change DB to a wrong host', done => {
        db.changeDB({
            user:     'root',
            pass:     '',
            database: 'mysqlcache',
            charset:  'utf8',
        }, err => {
            assert.throws(() => {
                if (err) {
                    throw err
                }
                done()
            }, Error)
        })
    })

    it('Create a pool error', done => {
        db.getPool(connection => {
            db.endPool(connection)
            assert.equal(db.endPool(connection), false)
            done()
        })
    })
})
