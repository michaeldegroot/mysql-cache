'use strict'

const mysql         = require('mysql')
const colors        = require('colors')
const crypto        = require('crypto')
const appRoot       = require('app-root-path')
const events        = require('events')
const eventEmitter  = new events.EventEmitter()
const cacheProvider = require(appRoot + '/cacheProvider')
const util          = require(appRoot + '/util')

exports.event           = eventEmitter
exports.cacheProvider   = cacheProvider
exports.cacheProviders  = cacheProvider.getAll()
exports.util            = util
exports.TTL             = 0
exports.poolConnections = 0

/**
 * Starts the connection to mysql and initializes cacheProvider setup
 * @param    {Object}    config
 * @param    {Function}  cb
 */
exports.init = (config, cb) => {
    exports.pool = mysql.createPool({
        host:              config.host,
        user:              config.user,
        password:          config.password,
        database:          config.database,
        connectionLimit:   config.connectionLimit,
        supportBigNumbers: true,
    })

    exports.TTL             = config.TTL * 1000
    util.verboseMode        = config.verbose
    exports.caching         = config.caching
    exports.connectionLimit = config.connectionLimit

    if (config.hasOwnProperty('cacheProvider') === false) {
        util.error('No cache provider given, please check the documentation if you have just updated this package https://github.com/michaeldegroot/mysql-cache/')
    }

    cacheProvider.setup(config)

    exports.pool.getConnection(function(err, connection) {
        if (err) {
            cb(false, err)
            util.error(err)

            return
        }
        exports.endPool(connection)
        let showConfig = JSON.parse(JSON.stringify(config))

        showConfig.password = showConfig.password.replace(/./gi, '*')
        util.trace(JSON.stringify(showConfig))
        util.trace(colors.green('Connected!'))
        eventEmitter.emit('connected')
        if (cb) {
            cb(true)
        }
    })
}

/**
 * Flushes all cache
 */
exports.flush = () => {
    cacheProvider.run('flush')
    eventEmitter.emit('flush')
    util.trace('Cache Flushed')
}

// Backward compatibility with flushAll command
exports.flushAll = exports.flush

/**
 * Returns some statistics about mysql-cache
 */
exports.stats = () => {
    util.trace('-----------------------')
    util.trace('Open Pool Connections: ' + exports.poolConnections)
    if (exports.poolConnections >= exports.connectionLimit) {
        util.trace('**** ' + colors.red('MYSQL POOL CONNECTION LIMIT REACHED'))
    }
    util.trace('-----------------------')
}

/**
 * Query the database and cache the result, or retrieve the value from cache straight away
 * @param    {Object}   sql
 * @param    {Object}   params
 * @param    {Function} callback
 * @param    {Object}   data
 */
exports.query = (sql, params, callback, data) => {
    const cacheMode   = exports.caching
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

    if (type === 'select') {
        const hash = crypto.createHash('sha512').update(createId(query)).digest('hex')

        exports.getKey(hash, (cache) => {
            if (!cacheMode) {
                cache = false
            }
            if (data) {
                if (data.cache === false) {
                    cache = false
                }
            }
            if (cache) {
                eventEmitter.emit('hit', query, hash, cache)
                util.trace(colors.yellow(hash) + '-' + colors.green(query))
                util.doCallback(callback, null, cache, generateObject(true, hash, query))
            } else {
                util.trace(colors.yellow(hash) + '-' + colors.red(query))
                dbQuery(sql, params, (err, result) => {
                    eventEmitter.emit('miss', query, hash, result)
                    if (data) {
                        if (data.hasOwnProperty('TTL')) {
                            TTLSet = data.TTL * 1000
                        }
                    } else {
                        TTLSet = exports.TTL * 1000
                    }
                    if (!cacheMode) {
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
            if (callback) {
                callback(err, result)
            }
        })
    }
}

const generateObject = (isCache, hash, sql) => {
    return {
        isCache,
        hash,
        sql,
    }
}

const dbQuery = (sql, params, callback) => {
    exports.getPool(connection => {
        connection.query(sql, params, (err, rows) => {
            util.error(err, mysql.format(sql, params))
            exports.endPool(connection)
            callback(err, rows)
        })
    })
}

const createId = id => {
    return id.replace(/ /g, '').toLowerCase()
}

exports.createId = createId

/**
 * Deletes a cache object by key
 * @param    {Object}   id
 * @param    {Object}   params
 */
exports.delKey = (id, params) => {
    if (typeof id === 'object') {
        params = id['params']
        id     = id['sql']
    }
    id = mysql.format(id, params)
    const hash = crypto.createHash('sha512').update(id).digest('hex')

    eventEmitter.emit('delete', hash)
    cacheProvider.run('remove', hash)
}

/**
 * Retrieves a cache object by key
 * @param    {Object}   id
 * @param    {Function} callback
 */
exports.getKey = (id, cb) => {
    cacheProvider.run('get', createId(id), null, null, cb)
}

/**
 * Creates a cache object
 * @param    {Object}   id
 * @param    {Object}   val
 * @param    {Number}   ttl
 * @param    {Function} cb
 */
exports.createKey = (id, val, ttl, cb) => {
    cacheProvider.run('set', createId(id), val, ttl, cb)
}

/**
 * Changes database settings on the fly
 * @param    {Object}   data
 * @param    {Function} cb
 */
exports.changeDB = (data, cb) => {
    exports.getPool(connection => {
        connection.changeUser(data, err => {
            exports.endPool(connection)
            if (err) {
                util.trace('warn', 'Could not change database connection settings.')
                util.doCallback(cb, err)

                return
            }
            util.trace('Successfully changed database connection settings')
            util.doCallback(cb, null, true)
        })
    })
}

/**
 * Create or get a pool connection
 * @param    {Function} cb
 */
exports.getPool = cb => {
    exports.pool.getConnection((err, connection) => {
        util.error(err)

        exports.poolConnections++
        cb(connection)
    })
}

/**
 * Kill a pool connection
 * @param    {Object} connection
 */
exports.endPool = connection => {
    if (exports.poolConnections === 0) {
        return false
    }
    exports.poolConnections--
    connection.release()

    return true
}
