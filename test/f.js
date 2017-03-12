'use strict'

const assert = require('assert-plus')
const MysqlCache = require('../app')
const settings = require('../settings').settings()

describe('Promises suite', function() {
    this.timeout(15000)

    it('Setup a caching mysql-cache', done => {
        settings.caching = true
        const db = new MysqlCache(settings)

        db.connectAsync().then(() => {
            db.queryAsync({sql:'SELECT 6 + 6 AS solution'}).then(res => {
                assert.equal(res[0][0].solution, 12)
                assert.equal(res[1].isCache, false)
            }).then(() => {
                db.queryAsync({sql:'SELECT 6 + 6 AS solution'}).then(result => {
                    assert.equal(result[0][0].solution, 12)
                    assert.equal(result[1].isCache, true)
                    done()
                })
            })
        })
    })

    it('refresh cache', done => {
        settings.caching = true
        const db = new MysqlCache(settings)

        db.connectAsync().then(() => {
            db.queryAsync({sql:'DELETE from test where name = ?', params: ['test2']}).then(result => {
                db.queryAsync({sql:'DELETE from test where name = ?', params: ['test']}).then(result => {
                    db.queryAsync('INSERT into test set ?', {
                        name: 'test',
                    }).then(result => {
                        db.queryAsync({sql:'SELECT * from test where name = ?', params: ['test']}).then(result => {
                            assert.equal(result[0][0].name, 'test')
                            assert.equal(result[1].isCache, false)

                            db.queryAsync({sql:'UPDATE test SET name = ? where name = ?', params: ['test2', 'test']}).then(result => {
                                db.queryAsync({sql:'SELECT * from test where name = ?', params: ['test'], refreshCache: true}).then(result => {
                                    assert.equal(result[0][0], undefined)
                                    assert.equal(result[1].isCache, false)
                                    done()
                                }).catch(e => {
                                    throw e
                                })
                            }).catch(e => {
                                throw e
                            })
                        }).catch(e => {
                            throw e
                        })
                    }).catch(e => {
                        throw e
                    })
                }).catch(e => {
                    throw e
                })
            }).catch(e => {
                throw e
            })
        })
    })
})
