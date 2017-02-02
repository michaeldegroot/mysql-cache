'use strict'

const mysql         = require('mysql')
const colors        = require('colors')
const crypto        = require('crypto')
const events        = require('events')
const eventEmitter  = new events.EventEmitter()
const cacheProvider = require('./lib/cacheProvider')
const util          = require('./lib/util')
const merge         = require('lodash.merge')

// Main object
const db = {}

// Exposed Properties
db.event           = eventEmitter
db.cacheProvider   = cacheProvider
db.mysql           = mysql
db.cacheProviders  = cacheProvider.getAll()
db.util            = util
db.hits            = 0
db.misses          = 0
db.queries         = 0
db.inserts         = 0
db.deletes         = 0
db.selects         = 0
db.updates         = 0
db.config          = null
db.ranInit         = false

/**
 * Checks if the init function was ran
 */
const checkRanInit = cb => {
    if (!cb) {
        cb = err => {
            throw new Error(err)
        }
    }

    if (!db.ranInit) {
        cb('The init function was not run yet or it failed.')

        return false
    }

    return true
}

/**
 * Starts the connection to mysql and initializes cacheProvider setup
 * @param    {Object}    config
 * @param    {Function}  cb
 */
db.start = (config, cb) => {
    // Start can be called without a callback
    if (!cb) {
        cb = () => {
            // Empty callback
        }
    }

    // Merge default settings with user settings
    db.config = merge({
        TTL:               0,
        verbose:           false,
        caching:           true,
        cacheProvider:     'lru',
        connectionLimit:   900000,
        supportBigNumbers: true,
    }, config)

    // Let util know of the state of verboseMode
    util.verboseMode = db.config.verbose

    // Show the configuration in verbose mode
    const showConfig = JSON.parse(JSON.stringify(db.config))

    showConfig.password = showConfig.password.replace(/./gi, '*')
    util.trace(JSON.stringify(showConfig))

    // Create a mysql connection pool with the configured
    db.pool = mysql.createPool(db.config)

    // Test the connection before continuing
    db.pool.getConnection((err, connection) => {
        if (err) {
            util.error(err)
        } else {
            // Setup the cacheProvider chosen
            cacheProvider.setup(db.config)

            util.trace(`${colors.bold(colors.green('Connected'))} to ${colors.bold('MySQL')} as ${colors.bold(db.config.user)}@${colors.bold(db.config.host)} with the ${colors.bold(db.config.cacheProvider)} cacheProvider`)
            eventEmitter.emit('connected')
            db.ranInit = true
            db.endPool(connection)

            // Verbose output pool events of the mysql package
            const poolPrefix = colors.cyan('Pool')

            db.pool.on('acquire', connection => {
                util.trace(`${poolPrefix}: recieved connection with id ${connection.threadId}`)
            })

            db.pool.on('connection', connection => {
                util.trace(`${poolPrefix}: Connection established with id ${connection.threadId}`)
            })

            db.pool.on('enqueue', () => {
                util.trace('${poolPrefix}: Waiting for available connection slot')
            })

            db.pool.on('release', connection => {
                util.trace(`${poolPrefix}: Connection ${connection.threadId} released`)
            })

            cb(null, true)
        }
    })
}
// Backward compatibility with init command
db.init = db.start

/**
 * Flushes all cache
 */
db.flush = () => {
    if (!checkRanInit()) {
        return
    }
    cacheProvider.run('flush')
    eventEmitter.emit('flush')
    util.trace('Cache Flushed')
}

// Backward compatibility with flushAll command
db.flushAll = db.flush

/**
 * Returns some statistics about mysql-cache
 */
db.stats = object => {
    if (object) {
        return {
            poolConnections: db.pool._allConnections.length,
            hits:            db.hits,
            misses:          db.misses,
            total:           db.queries,
            selects:         db.selects,
            inserts:         db.inserts,
            updates:         db.updates,
            deletes:         db.deletes,
        }
    } else {
        util.trace('Open Pool Connections: ' + db.pool._allConnections.length)
        util.trace('Cache Hits: ' + db.hits)
        util.trace('Cache Misses: ' + db.misses)
        util.trace('Total Queries: ' + db.queries)
        util.trace('Total Select Statements: ' + db.selects)
        util.trace('Total Insert Statements: ' + db.inserts)
        util.trace('Total Update Statements: ' + db.updates)
        util.trace('Total Remove Statements: ' + db.deletes)
    }
}

/**
 * Query the database and cache the result, or retrieve the value from cache straight away
 * @param    {Object}   sql
 * @param    {Object}   params
 * @param    {Function} cb
 * @param    {Object}   data
 */
db.query = (sql, params, cb, data) => {
    if (!checkRanInit(cb)) {
        return
    }
    db.queries++
    let query

    if (typeof params === 'function') {
        data = cb
        cb = params
        params = []
        query = sql
    } else {
        query = sql
    }
    if (typeof sql === 'object') {
        query = sql.sql
        params = sql.params
    }

    // A query can be called without a callback
    if (!cb) {
        cb = () => {
            // Empty callback
        }
    }

    const type = query.split(' ')[0].toLowerCase()
    let TTLSet = 0

    query = mysql.format(query, params)
    eventEmitter.emit('query', query)
    const hash = db.createHash(query)

    util.trace(colors.bold(type.toUpperCase()) + ' ' + colors.yellow(hash.slice(0, 15)) + ' ' + colors.grey(colors.bold(query)))

    if (type === 'insert') {
        db.inserts++
    }

    if (type === 'update') {
        db.updates++
    }

    if (type === 'delete') {
        db.deletes++
    }

    if (type === 'select') {
        db.selects++

        db.getKey(hash, (err, cache) => {
            if (err) {
                util.error(err)
            } else {
                if (!db.config.caching) {
                    cache = false
                }
                if (data) {
                    if (data.cache === false) {
                        cache = false
                    }
                }
                if (cache) {
                    eventEmitter.emit('hit', query, hash, cache)
                    util.trace(colors.yellow(hash.slice(0, 15)) + ' ' + colors.green(colors.bold('HIT')))
                    db.hits++
                    cb(null, cache, generateObject(true, hash, query))
                } else {
                    util.trace(colors.yellow(hash.slice(0, 15)) + ' ' + colors.red(colors.bold('MISS')))
                    db.misses++
                    dbQuery(sql, params, (err, result) => {
                        if (err) {
                            util.error(err)
                        } else {
                            eventEmitter.emit('miss', query, hash, result)
                            let enableCache = true

                            TTLSet = db.config.TTL * 1000
                            if (data) {
                                if (data.hasOwnProperty('TTL')) {
                                    TTLSet = data.TTL * 1000
                                }
                                if (data.hasOwnProperty('cache')) {
                                    enableCache = data.cache
                                }
                            }

                            if (!db.config.caching || !enableCache) {
                                cb(null, result, generateObject(false, hash, query))
                            } else {
                                db.createKey(hash, result, TTLSet, (err, keyResult) => {
                                    if (err) {
                                        util.error(err)
                                    } else {
                                        if (!keyResult) {
                                            cb('createKey result was not saved')
                                        } else {
                                            cb(null, result, generateObject(false, hash, query))
                                        }
                                    }
                                })
                            }
                        }
                    })
                }
            }
        })
    } else {
        dbQuery(sql, params, (err, result) => {
            if (err) {
                util.error(err)
            } else {
                cb(null, result)
            }
        })
    }
}

/**
 * Generates a object that mysqlCache exposes after a .query cb
 */
const generateObject = (isCache, hash, sql) => {
    return {
        isCache,
        hash,
        sql,
    }
}

/**
 * Handles pool connection and queries the database
 */
const dbQuery = (sql, params, cb) => {
    db.getPool((err, connection) => {
        if (err) {
            util.error(err)
        } else {
            connection.query(sql, params, (err, rows) => {
                if (err) {
                    util.error(err)
                } else {
                    db.endPool(connection)
                    cb(null, rows)
                }
            })
        }
    })
}

/**
 * How a hash id is created from scratch
 * @param    {String}   id
 */
db.createHash = id => {
    id = id.replace(/ /g, '').toLowerCase()
    id = crypto.createHash('sha512').update(id).digest('hex')

    return id
}

/**
 * Deletes a cache object by key
 * @param    {Object}   id
 * @param    {Object}   params
 */
db.delKey = (id, params) => {
    if (!checkRanInit()) {
        return
    }

    if (typeof id === 'object') {
        params = id['params']
        id     = id['sql']
    }

    const hash = db.createHash(mysql.format(id, params))

    eventEmitter.emit('delete', hash)
    cacheProvider.run('remove', hash)
}

/**
 * Retrieves a cache object by key
 * @param    {Object}   id
 * @param    {Function} cb
 */
db.getKey = (id, cb) => {
    if (!checkRanInit(cb)) {
        return
    }

    eventEmitter.emit('get', id)
    cacheProvider.run('get', id, null, null, cb)
}

/**
 * Creates a cache object
 * @param    {Object}   id
 * @param    {Object}   val
 * @param    {Number}   ttl
 * @param    {Function} cb
 */
db.createKey = (id, val, ttl, cb) => {
    if (!checkRanInit(cb)) {
        return
    }
    eventEmitter.emit('create', id, val, ttl)
    cacheProvider.run('set', id, val, ttl, cb)
}

/**
 * Changes database settings on the fly
 * @param    {Object}   data
 * @param    {Function} cb
 */
db.changeDB = (data, cb) => {
    if (!checkRanInit(cb)) {
        return
    }
    db.getPool((err, connection) => {
        if (err) {
            util.error(err)
        } else {
            connection.changeUser(data, err => {
                db.endPool(connection)
                eventEmitter.emit('databaseChanged', data)
                util.trace('Successfully changed database connection settings')
                if (err) {
                    util.error(err)
                } else {
                    cb(null, true)
                }
            })
        }
    })
}

/**
 * Create or get a pool connection
 * @param    {Function} cb
 */
db.getPool = cb => {
    if (!checkRanInit(cb)) {
        return
    }
    db.pool.getConnection((err, connection) => {
        if (err) {
            util.error(err)
        } else {
            eventEmitter.emit('getPool', connection)
            cb(null, connection)
        }
    })
}

/**
 * Kill a pool connection
 * @param    {Object} connection
 */
db.endPool = connection => {
    if (!checkRanInit()) {
        return false
    }

    if (!connection) {
        throw new Error('connection is undefined')
    }

    if (db.pool._freeConnections.indexOf(connection) === -1) {
        connection.release()
        eventEmitter.emit('endPool', connection)

        return true
    }

    return false
}

/**
 * Kills the pool
 * @param    {Function} cb
 */
db.killPool = cb => {
    if (!checkRanInit(cb)) {
        return
    }

    // killPool can be called without a callback
    if (!cb) {
        cb = () => {
            // Empty callback
        }
    }

    db.pool.end(err => {
        if (err) {
            util.error(err)
        } else {
            eventEmitter.emit('killPool')
            cb(null, true)
        }
    })
}

module.exports = db
