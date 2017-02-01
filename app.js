'use strict'

const mysql         = require('mysql')
const colors        = require('colors')
const crypto        = require('crypto')
const appRoot       = require('app-root-path')
const events        = require('events')
const eventEmitter  = new events.EventEmitter()
const cacheProvider = require(appRoot + '/cacheProvider')
const util          = require(appRoot + '/util')
const merge         = require('lodash.merge')

// Exposed Properties
exports.event           = eventEmitter
exports.cacheProvider   = cacheProvider
exports.mysql           = mysql
exports.cacheProviders  = cacheProvider.getAll()
exports.util            = util
exports.hits            = 0
exports.misses          = 0
exports.queries         = 0
exports.inserts         = 0
exports.deletes         = 0
exports.selects         = 0
exports.updates         = 0
exports.config          = null
exports.ranInit         = false

/**
 * Checks if the init function was ran
 */
const checkRanInit = () => {
    if (!exports.ranInit) {
        util.error('The init function was not run yet or it failed.')

        return false
    }

    return true
}

/**
 * Starts the connection to mysql and initializes cacheProvider setup
 * @param    {Object}    config
 * @param    {Function}  cb
 */
exports.start = (config, cb) => {
    // Merge default settings with user settings
    exports.config = merge({
        TTL:               0,
        verbose:           false,
        caching:           true,
        cacheProvider:     'lru',
        connectionLimit:   1000,
        supportBigNumbers: true,
    }, config)

    // Let util know of the state of verboseMode
    util.verboseMode = exports.config.verbose

    // Show the configuration in verbose mode
    const showConfig = JSON.parse(JSON.stringify(exports.config))

    showConfig.password = showConfig.password.replace(/./gi, '*')
    util.trace(JSON.stringify(showConfig))

    // Create a mysql connection pool with the configured
    exports.pool = mysql.createPool(exports.config)

    // Test the connection before continuing
    exports.pool.getConnection((err, connection) => {
        if (err) {
            util.error(err)
            util.doCallback(cb, err)

            return
        }
        // Setup the cacheProvider chosen
        cacheProvider.setup(exports.config)

        util.trace(`${colors.bold(colors.green('Connected'))} to ${colors.bold('MySQL')} as ${colors.bold(exports.config.user)}@${colors.bold(exports.config.host)} with the ${colors.bold(exports.config.cacheProvider)} cacheProvider`)
        eventEmitter.emit('connected')
        exports.ranInit = true
        exports.endPool(connection)
        util.doCallback(cb, null, true)
    })

    // Verbose output pool events of the mysql package
    const poolPrefix = colors.cyan('Pool')

    exports.pool.on('acquire', connection => {
        util.trace(`${poolPrefix}: recieved connection with id ${connection.threadId}`)
    })

    exports.pool.on('connection', connection => {
        util.trace(`${poolPrefix}: Connection established with id ${connection.threadId}`)
    })

    exports.pool.on('enqueue', () => {
        util.trace('${poolPrefix}: Waiting for available connection slot')
    })

    exports.pool.on('release', connection => {
        util.trace(`${poolPrefix}: Connection ${connection.threadId} released`)
    })
}
// Backward compatibility with init command
exports.init = exports.start

/**
 * Flushes all cache
 */
exports.flush = () => {
    if (!checkRanInit()) {
        return
    }
    cacheProvider.run('flush')
    eventEmitter.emit('flush')
    util.trace('Cache Flushed')
}

// Backward compatibility with flushAll command
exports.flushAll = exports.flush

/**
 * Returns some statistics about mysql-cache
 */
exports.stats = object => {
    if (object) {
        return {
            poolConnections: exports.pool._allConnections.length,
            hits:            exports.hits,
            misses:          exports.misses,
            total:           exports.queries,
            selects:         exports.selects,
            inserts:         exports.inserts,
            updates:         exports.updates,
            deletes:         exports.deletes,
        }
    } else {
        util.trace('Open Pool Connections: ' + exports.pool._allConnections.length)
        util.trace('Cache Hits: ' + exports.hits)
        util.trace('Cache Misses: ' + exports.misses)
        util.trace('Total Queries: ' + exports.queries)
        util.trace('Total Select Statements: ' + exports.selects)
        util.trace('Total Insert Statements: ' + exports.inserts)
        util.trace('Total Update Statements: ' + exports.updates)
        util.trace('Total Remove Statements: ' + exports.deletes)
    }
}

/**
 * Query the database and cache the result, or retrieve the value from cache straight away
 * @param    {Object}   sql
 * @param    {Object}   params
 * @param    {Function} callback
 * @param    {Object}   data
 */
exports.query = (sql, params, callback, data) => {
    if (!checkRanInit()) {
        return
    }
    exports.queries++
    let query

    if (typeof params === 'function') {
        data      = callback
        callback  = params
        params    = []
        query = sql
    } else {
        query = sql
    }
    if (typeof sql === 'object') {
        query = sql.sql
        params = sql.params
    }
    const type = query.split(' ')[0].toLowerCase()
    let TTLSet = 0

    query = mysql.format(query, params)
    eventEmitter.emit('query', query)

    if (type === 'insert') {
        exports.inserts++
    }

    if (type === 'update') {
        exports.updates++
    }

    if (type === 'delete') {
        exports.deletes++
    }

    if (type === 'select') {
        exports.selects++
        const hash = exports.createHash(query)

        exports.getKey(hash, (cache) => {
            if (!exports.config.caching) {
                cache = false
            }
            if (data) {
                if (data.cache === false) {
                    cache = false
                }
            }
            if (cache) {
                eventEmitter.emit('hit', query, hash, cache)
                util.trace(colors.yellow(hash.slice(0, 15)) + '-' + colors.green(query))
                exports.hits++
                util.doCallback(callback, null, cache, generateObject(true, hash, query))
            } else {
                util.trace(colors.yellow(hash.slice(0, 15)) + '-' + colors.red(query))
                exports.misses++
                dbQuery(sql, params, (err, result) => {
                    eventEmitter.emit('miss', query, hash, result)
                    let enableCache = true

                    if (data) {
                        if (data.hasOwnProperty('TTL')) {
                            TTLSet = data.TTL * 1000
                        }
                        if (data.hasOwnProperty('cache')) {
                            enableCache = data.cache
                        }
                    } else {
                        TTLSet = exports.config.TTL * 1000
                    }
                    if (!exports.config.caching || !enableCache) {
                        util.doCallback(callback, err, result, generateObject(false, hash, query))
                    } else {
                        exports.createKey(hash, result, TTLSet, () => {
                            util.doCallback(callback, err, result, generateObject(false, hash, query))
                        })
                    }
                })
            }
        })
    } else {
        dbQuery(sql, params, (err, result) => {
            util.doCallback(callback, err, result)
        })
    }
}

/**
 * Generates a object that mysqlCache exposes after a .query callback
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
const dbQuery = (sql, params, callback) => {
    exports.getPool((err, connection) => {
        util.error(err)
        connection.query(sql, params, (err, rows) => {
            util.error(err)
            exports.endPool(connection)
            callback(err, rows)
        })
    })
}

/**
 * How a hash id is created from scratch
 * @param    {String}   id
 */
exports.createHash = id => {
    id = id.replace(/ /g, '').toLowerCase()
    id = crypto.createHash('sha512').update(id).digest('hex')

    return id
}

/**
 * Deletes a cache object by key
 * @param    {Object}   id
 * @param    {Object}   params
 */
exports.delKey = (id, params) => {
    if (!checkRanInit()) {
        return
    }

    if (typeof id === 'object') {
        params = id['params']
        id     = id['sql']
    }

    const hash = exports.createHash(mysql.format(id, params))

    eventEmitter.emit('delete', hash)
    cacheProvider.run('remove', hash)
}

/**
 * Retrieves a cache object by key
 * @param    {Object}   id
 * @param    {Function} callback
 */
exports.getKey = (id, cb) => {
    if (!checkRanInit()) {
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
exports.createKey = (id, val, ttl, cb) => {
    if (!checkRanInit()) {
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
exports.changeDB = (data, cb) => {
    if (!checkRanInit()) {
        return
    }
    eventEmitter.emit('databaseChanged', data)
    exports.getPool((err, connection) => {
        util.error(err)
        connection.changeUser(data, err => {
            exports.endPool(connection)
            util.error(err)
            util.trace('Successfully changed database connection settings')
            util.doCallback(cb, err)
        })
    })
}

/**
 * Create or get a pool connection
 * @param    {Function} cb
 */
exports.getPool = cb => {
    if (!checkRanInit()) {
        return
    }
    exports.pool.getConnection((err, connection) => {
        util.error(err)
        if (!err) {
            eventEmitter.emit('getPool', connection)
        }
        util.doCallback(cb, err, connection)
    })
}

/**
 * Kill a pool connection
 * @param    {Object} connection
 */
exports.endPool = connection => {
    if (!checkRanInit()) {
        return
    }
    eventEmitter.emit('endPool', connection)
    if (exports.pool._freeConnections.indexOf(connection) === -1) {
        connection.release()
    }

    return true
}

/**
 * Kills the pool
 * @param    {Function} cb
 */
exports.killPool = cb => {
    if (!checkRanInit()) {
        return
    }
    eventEmitter.emit('killPool')
    exports.pool.end(err => {
        util.error(err)
        util.doCallback(cb, err, true)
    })
}
