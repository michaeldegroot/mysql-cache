'use strict'

const assert = require('assert-plus')
const MysqlCache = require('../app')
const settings = require('../settings').settings()
let db

describe('Weird and random suite', function() {
    this.timeout(15000)

    it('Setup mysql-cache', done => {
        db = new MysqlCache(settings)

        db.connectAsync().then(() => {
            done()
        })
    })
    it('update query', done => {
        db.query({sql:'update test set id = 1 where id = 1'}, (err, resultMysql, mysqlCache) => {
            done()
        })
    })

    it('test trace', () => {
        settings.verbose = true
        db.trace('kappa')
    })

    it('test error', () => {
        db.error(new Error('TESTTT :D'))
    })

    it('test error #2', () => {
        db.error(new Error('TESTTT :D'))
    })

    it('cacheprovider: illigal run action', () => {
        assert.throws(() => {
            db.cacheProvider.run('ditbestaatniet', 'klappa', null, null, err => {
                if (err) {
                    throw new Error(err)
                }
            })
        }, Error)
    })

    it('cacheprovider: illigal cacheprovider action', () => {
        settings.cacheProvider = 'clappa'
        assert.throws(() => {
            const db = new MysqlCache(settings)
        }, Error)
    })

    it('flush without cb', done => {
        settings.cacheProvider = 'lru'
        settings.prettyError = true
        settings.printErrors = true
        const db = new MysqlCache(settings)

        db.connectAsync().then(() => {
            db.flush()
            done()
        })
    })

    it('end undefined pool', done => {
        const db = new MysqlCache(settings)

        db.connectAsync().then(() => {
            assert.equal(db.endPool(undefined), false)
            done()
        })
    })

    it('query error', done => {
        const db = new MysqlCache(settings)

        db.connectAsync().then(() => {
            db.query({sql:'select 1 + 1 asfsdfdsfsd dfs 432134  tgfd solution'}, (err, resultMysql, mysqlCache) => {
                assert.throws(() => {
                    if (err) {
                        throw new Error(err)
                    }
                }, Error)
                done()
            })
        })
    })
})
