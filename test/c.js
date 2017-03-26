'use strict'

const assert     = require('assert-plus')
const MysqlCache = require('../app')
const settings   = require('../settings').settings()
const async      = require('async')
const mysql      = require('mysql2')
let db = new MysqlCache(settings)

const cacheProviders = db.cacheProviders
const didSql         = {}

for (let i = cacheProviders.length - 1; i >= 0; i--) {
    didSql[cacheProviders[i]] = []
};

describe('CacheProvider Test Suite', function() {
    this.timeout(1000)

    it('Start ' + cacheProviders.length + ' cacheProviders', done => {
        async.each(cacheProviders, cacheProvider => {
            doRun(cacheProvider)
        })
        done()
    })
})

const doRun = (provider, cb) => {
    if (provider === 'mmap') {
        try {
            require.resolve('mmap-object')
        } catch (e) {
            console.log('mmap-object is not installed and this test will be skipped!!')

            return
        }
    }

    describe(provider.toUpperCase() + ' cacheProvider', function() {
        this.timeout(1200000)

        it('Setup mysql-cache', done => {
            settings.cacheProvider = provider
            db = new MysqlCache(settings)

            db.connectAsync().then(() => {
                done()
            })
        })

        it('Flush', done => {
            db.flush(() => {
                db.query('SELECT ? + ? AS solution', [422, 18], (err1, resultMysql1, cache) => {
                    if (err1) {
                        throw new Error(err1)
                    }
                    assert.equal(resultMysql1[0].solution, 440)
                    assert.equal(cache.isCache, false)
                    db.query('SELECT ? + ? AS solution', [422, 18], (err2, resultMysql2, cache) => {
                        if (err2) {
                            throw new Error(err2)
                        }
                        assert.equal(resultMysql2[0].solution, 440)
                        assert.equal(cache.isCache, true)
                        db.flush(() => {
                            db.query('SELECT ? + ? AS solution', [422, 18], (err3, resultMysql3, cache) => {
                                if (err3) {
                                    throw new Error(err3)
                                }
                                assert.equal(resultMysql3[0].solution, 440)
                                assert.equal(cache.isCache, false)
                                done()
                            })
                        })
                    })
                })
            })
        })

        it('Cache zones', done => {
            db.query({
                sql:    'SELECT ? + ? AS solution',
                params: [420, 420],
                zone:   'klappazone',
            }, (err, res, cache) => {
                if (err) {
                    throw err
                }

                db.query({
                    sql:    'SELECT ? + ? AS solution',
                    params: [425, 425],
                    zone:   'klappazone',
                }, (err, res, cache) => {
                    if (err) {
                        throw err
                    }

                    db.query({
                        sql:    'SELECT ? + ? AS solution',
                        params: [430, 430],
                    }, (err, res, cache) => {
                        if (err) {
                            throw err
                        }
                        db.clearZone('klappazone', () => {
                            db.query({
                                sql:    'SELECT ? + ? AS solution',
                                params: [430, 430],
                            }, (err, res, cache) => {
                                if (err) {
                                    throw err
                                }
                                assert.equal(cache.isCache, true)

                                db.query({
                                    sql:    'SELECT ? + ? AS solution',
                                    params: [420, 420],
                                }, (err, res, cache) => {
                                    if (err) {
                                        throw err
                                    }
                                    assert.equal(cache.isCache, false)
                                    db.query({
                                        sql:    'SELECT ? + ? AS solution',
                                        params: [425, 425],
                                    }, (err, res, cache) => {
                                        if (err) {
                                            throw err
                                        }
                                        assert.equal(cache.isCache, false)
                                        done()
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })

        if (provider !== 'mmap') {
            it('Test TTL one time setting (2 seconds)', done => {
                db.query('SELECT ? + ? AS solution', [344, 1], (err1, resultMysql1, cache) => {
                    if (err1) {
                        throw new Error(err1)
                    }
                    assert.equal(resultMysql1[0].solution, 345)
                    assert.equal(cache.isCache, false)
                    db.query('SELECT ? + ? AS solution', [344, 1], (err2, resultMysql2, cache) => {
                        if (err2) {
                            throw new Error(err2)
                        }
                        assert.equal(resultMysql2[0].solution, 345)
                        assert.equal(cache.isCache, true)
                        setTimeout(() => {
                            db.query('SELECT ? + ? AS solution', [344, 1], (err3, resultMysql3, cache) => {
                                if (err3) {
                                    throw new Error(err3)
                                }
                                assert.equal(resultMysql3[0].solution, 345)
                                assert.equal(cache.isCache, false)
                                done()
                            })
                        }, 2000)
                    })
                }, {
                    TTL: 1 // Will set TTL to 1 seconds only for this query
                })
            })

            it('Test TTL main setting (2 seconds)', done => {
                db.config.TTL = 1 // Will set TTL to 1 seconds for feature queries
                db.query('SELECT ? + ? AS solution', [1, 344], (err1, resultMysql1, cache) => {
                    if (err1) {
                        throw new Error(err1)
                    }
                    assert.equal(resultMysql1[0].solution, 345)
                    assert.equal(cache.isCache, false)
                    db.query('SELECT ? + ? AS solution', [1, 344], (err2, resultMysql2, cache) => {
                        if (err2) {
                            throw new Error(err2)
                        }
                        assert.equal(resultMysql2[0].solution, 345)
                        assert.equal(cache.isCache, true)
                        setTimeout(() => {
                            // Now well over 2 seconds total
                            db.query('SELECT ? + ? AS solution', [1, 344], (err3, resultMysql3, cache) => {
                                if (err3) {
                                    throw new Error(err3)
                                }
                                assert.equal(resultMysql3[0].solution, 345)
                                assert.equal(cache.isCache, false)
                                db.TTL = 0 // Reset TTL
                                done()
                            })
                        }, 2000)
                    })
                })
            })
        }

        it('Call a new query', done => {
            db.query('SELECT ? + ? AS solution', [60, 2], (err, resultMysql, cache) => {
                if (err) {
                    throw new Error(err)
                }
                assert.equal(resultMysql[0].solution, 62)
                assert.equal(cache.isCache, false)
                done()
            }, {
                cache: false,
            })
        })

        it('Call the same query again (no cache hit)', done => {
            db.query('SELECT ? + ? AS solution', [60, 2], (err, resultMysql, cache) => {
                if (err) {
                    throw new Error(err)
                }
                assert.equal(resultMysql[0].solution, 62)
                assert.equal(cache.isCache, false)
                done()
            })
        })

        it('Call a new query', done => {
            db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql, cache) => {
                if (err) {
                    throw new Error(err)
                }
                assert.equal(resultMysql[0].solution, 6)
                done()
            })
        })

        it('Call the same query again (cache hit)', done => {
            db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql, cache) => {
                if (err) {
                    throw new Error(err)
                }
                assert.equal(resultMysql[0].solution, 6)
                assert.equal(cache.isCache, true)
                done()
            })
        })

        it('Call a new query', done => {
            db.config.caching = false
            db.query('SELECT ? + ? AS solution', [5, 55], (err, resultMysql, cache) => {
                if (err) {
                    throw new Error(err)
                }
                assert.equal(cache.isCache, false)
                assert.equal(resultMysql[0].solution, 60)
                done()
            })
        })

        it('Call the same query again (no cache hit)', done => {
            db.query('SELECT ? + ? AS solution', [5, 55], (err, resultMysql, cache) => {
                if (err) {
                    throw new Error(err)
                }
                assert.equal(resultMysql[0].solution, 60)
                assert.equal(cache.isCache, false)
                db.config.caching = true
                done()
            })
        })

        it('Delete a key', done => {
            db.query('SELECT ? + ? AS solution', [66, 66], (err1, resultMysql1, cache) => {
                if (err1) {
                    throw new Error(err1)
                }
                assert.equal(resultMysql1[0].solution, 132)
                assert.equal(cache.isCache, false)
                db.query('SELECT ? + ? AS solution', [66, 66], (err2, resultMysql2, cache) => {
                    if (err2) {
                        throw new Error(err2)
                    }
                    assert.equal(resultMysql2[0].solution, 132)
                    assert.equal(cache.isCache, true)
                    db.delKey('SELECT ? + ? AS solution', [66, 66], delKeyError => {
                        if (delKeyError) {
                            throw new Error(delKeyError)
                        }
                        db.query('SELECT ? + ? AS solution', [66, 66], (err3, resultMysql3, cache) => {
                            if (err3) {
                                throw new Error(err3)
                            }
                            assert.equal(resultMysql3[0].solution, 132)
                            assert.equal(cache.isCache, false)
                            done()
                        })
                    })
                })
            })
        })

        it('Delete a key v2', done => {
            db.query('SELECT ? + ? AS solution', [66, 67], (err1, resultMysql1, cache) => {
                if (err1) {
                    throw new Error(err1)
                }
                assert.equal(resultMysql1[0].solution, 133)
                assert.equal(cache.isCache, false)
                db.query({sql: 'SELECT ? + ? AS solution', params: [66, 67]}, (err2, resultMysql2, cache) => {
                    if (err2) {
                        throw new Error(err2)
                    }
                    assert.equal(resultMysql2[0].solution, 133)
                    assert.equal(cache.isCache, true)
                    db.delKey({sql: 'SELECT ? + ? AS solution', params: [66, 67]}, delKeyError => {
                        if (delKeyError) {
                            throw new Error(delKeyError)
                        }
                        db.query('SELECT ? + ? AS solution', [66, 67], (err3, resultMysql3, cache) => {
                            if (err3) {
                                throw new Error(err3)
                            }
                            assert.equal(resultMysql3[0].solution, 133)
                            assert.equal(cache.isCache, false)
                            done()
                        })
                    })
                })
            })
        })

        it('Call a INSERT query', done => {
            db.query('insert into test set ?', {
                name: 1337,
            }, (err, resultMysql, cache) => {
                if (err) {
                    throw new Error(err)
                }
                assert.equal(err, null)
                done()
            })
        })

        it('Delete the inserted row', done => {
            db.query('delete from test where name = ?', ['1337'], (err, resultMysql, cache) => {
                if (err) {
                    throw new Error(err)
                }
                assert.equal(resultMysql.affectedRows, 1)
                done()
            })
        })

        it('Verify hash', done => {
            const sql           = 'SELECT ? + ? AS solution'
            const params        = [55, 44]
            const generatedSql  = String(mysql.format(sql, params))

            db.createHashAsync(generatedSql).then(generatedHash => {
                db.query(generatedSql, (err, resultMysql, cache) => {
                    if (err) {
                        throw new Error(err)
                    }
                    assert.equal(cache.hash, generatedHash)
                    assert.equal(resultMysql[0].solution, 99)
                    done()
                })
            })
        })

        it('Verify hash of 2 identical queries', done => {
            const sql1           = 'SELECT ? + ? AS solution'
            const params1        = [9, 1]
            const generatedSql1  = String(mysql.format(sql1, params1))
            const sql2           = 'SELECT ? + ? AS solution'
            const params2        = [9, 1]
            const generatedSql2  = String(mysql.format(sql2, params2))

            db.query(generatedSql1, (err1, resultMysql1, cache) => {
                if (err1) {
                    throw new Error(err1)
                }
                db.query(generatedSql2, (err2, resultMysql2, cache) => {
                    if (err2) {
                        throw new Error(err2)
                    }
                    assert.equal(resultMysql1[0].solution === resultMysql2[0].solution, true)
                    assert.equal(resultMysql1[0].solution, 10)
                    assert.equal(cache.hash, cache.hash)
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

            db.query(generatedSql1, (err1, resultMysql1, cache) => {
                if (err1) {
                    throw new Error(err1)
                }
                db.query(generatedSql2, (err2, resultMysql2, cache) => {
                    if (err2) {
                        throw new Error(err2)
                    }
                    assert.equal(resultMysql1[0].solution === resultMysql2[0].solution, true)
                    assert.equal(resultMysql1[0].solution, 10)
                    assert.equal(cache.hash, cache.hash)
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

            db.query(generatedSql1, (err1, resultMysql1, cache) => {
                if (err1) {
                    throw new Error(err1)
                }
                db.query(generatedSql2, (err2, resultMysql2, cache) => {
                    if (err2) {
                        throw new Error(err2)
                    }
                    assert.equal(resultMysql1[0].solution === resultMysql2[0].solution, true)
                    assert.equal(resultMysql1[0].solution, 10)
                    assert.equal(cache.hash, cache.hash)
                    done()
                })
            })
        })

        it('Create, read (no cache), read (cache), delete and read (no cache) - 10000 times', done => {
            db.flushAll(err => {
                if (err) {
                    throw new Error(err)
                }

                db.config.TTL = 0

                const amountArray = []
                const amount = 10000

                for (let i = 0; i < amount; i++) {
                    amountArray.push(i)
                }

                async.eachLimit(amountArray, 1, function (item, innerCallback) {
                    const randomA = Math.round(Math.random() * 10000000000000000)
                    const randomB = Math.round(Math.random() * 10000000000000000)

                    didSql[provider].push(['SELECT ? + ? AS solution', [randomA, randomB]])
                    db.query('SELECT ? + ? AS solution', [randomA, randomB], (err1, mysql1, cache) => {
                        if (err1) {
                            innerCallback(err1)
                        } else {
                            assert.equal(mysql1[0].solution, randomA + randomB)
                            assert.equal(cache.isCache, false)
                            db.query('SELECT ? + ? AS solution', [randomA, randomB], (err2, mysql2, cache) => {
                                if (err2) {
                                    innerCallback(err2)
                                } else {
                                    assert.equal(mysql2[0].solution, randomA + randomB)
                                    assert.equal(cache.isCache, true)
                                    db.delKey('SELECT ? + ? AS solution', [randomA, randomB], errKey => {
                                        if (errKey) {
                                            throw new Error(errKey)
                                        }
                                        db.query('SELECT ? + ? AS solution', [randomA, randomB], (err3, mysql3, cache) => {
                                            if (err3) {
                                                innerCallback(err3)
                                            } else {
                                                assert.equal(mysql3[0].solution, randomA + randomB)
                                                assert.equal(cache.isCache, false)
                                                innerCallback()
                                            }
                                        })
                                    })
                                }
                            })
                        }
                    })
                }, function(err) {
                    if (err) {
                        throw new Error(err)
                    }
                    done()
                })
            })
        })

        it('Kills the connection pool', done => {
            db.killPool(done)
        })
    })
}
