'use strict'

const assert = require('assert-plus')
const MysqlCache = require('../app')
const settings = require('../settings').settings()
let db

describe('Weird and random suite', function() {
    this.timeout(15000)

    it('Setup mysql-cache', done => {
        db = new MysqlCache(settings)

        db.event.on('connected', () => {
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
        db.util.trace('kappa')
    })

    it('test error', () => {
        db.util.error(new Error('TESTTT :D'))
    })

    it('test error #2', () => {
        settings.prettyError = false
        settings.printErrors = true
        db.util.error(new Error('TESTTT :D'))
    })

    it('test FATAL error', () => {
        settings.prettyError = false
        settings.printErrors = true
        const klappaError = new Error('TESTTT :D')

        klappaError.fatal = true

        assert.throws(() => {
            db.util.error(klappaError)
        }, Error)
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

    it('cacheprovider: illigal cacheprovider action', done => {
        settings.cacheProvider = 'clappa'
        settings.prettyError = true
        settings.printErrors = true
        const newClappaDB = new MysqlCache(settings)

        newClappaDB.event.on('connected', () => {
            newClappaDB.query({sql:'select 1 + 1 as solution'}, (err, resultMysql, mysqlCache) => {
                if (err) {
                    throw new Error(err)
                }
                done()
            })
        })
    })

    it('cacheprovider: run without callback', done => {
        settings.cacheProvider = 'lru'
        settings.prettyError = true
        settings.printErrors = true
        const newClappaDB = new MysqlCache(settings)

        newClappaDB.event.on('connected', () => {
            newClappaDB.cacheProvider.run('get')
            done()
        })
    })

    it('flush without cb', done => {
        settings.cacheProvider = 'lru'
        settings.prettyError = true
        settings.printErrors = true
        const newClappaDB = new MysqlCache(settings)

        newClappaDB.event.on('connected', () => {
            newClappaDB.flush()
            done()
        })
    })

    it('end undefined pool', done => {
        const newClappaDB = new MysqlCache(settings)

        newClappaDB.event.on('connected', () => {
            assert.equal(newClappaDB.endPool(undefined), false)
            done()
        })
    })

    it('query error', done => {
        const newClappaDB = new MysqlCache(settings)

        newClappaDB.event.on('connected', () => {
            newClappaDB.query({sql:'select 1 + 1 asfsdfdsfsd dfs 432134  tgfd solution'}, (err, resultMysql, mysqlCache) => {
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
