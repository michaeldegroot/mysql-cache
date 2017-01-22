
'use strict'

const mysql   = require('mysql')
const colors  = require('colors')
const crypto  = require('crypto')

let cacheProvider

// LRU
const LRU      = require('lru-cache')
const LRUCache = LRU()

// MMAP
const MMAPCache = require('mmap-object')
let MMAPObject

// REDIS
const redis = require('redis')
let redisClient

// NODE-CACHE
const Ncache    = require('node-cache')
const NodeCache = new Ncache({
    stdTTL:      0,
    checkperiod: 120,
})

// NATIVE
let nativeCache = {}

const supportedCacheProviders = [
    'LRU',
    'mmap',
    'redis',
    'node-cache',
    'native',
]

const cacheAction = (action, hash, val, ttl, callback) => {
    exports.trace('cacheAction ' + cacheProvider + ' ' + action.toUpperCase())

    // FLUSH
    if (action === 'flush') {
        // LRU
        if (cacheProvider === 'LRU') {
            LRUCache.reset()
        }

        // REDIS
        if (cacheProvider === 'redis') {
            redisClient.flushdb()
        }

        // NATIVE
        if (cacheProvider === 'native') {
            nativeCache = {}
        }

        // MMAP
        if (cacheProvider === 'mmap') {
            MMAPObject = {}
        }
    }

    // REMOVE
    if (action === 'remove') {
        // LRU
        if (cacheProvider === 'LRU') {
            LRUCache.del(hash)
        }

        // REDIS
        if (cacheProvider === 'redis') {
            LRUCache.del(hash)
        }

        // NATIVE
        if (cacheProvider === 'native') {
            delete nativeCache.hash
        }

        // MMAP
        if (cacheProvider === 'mmap') {
            delete MMAPObject.hash
        }

        // NODE-CACHE
        if (cacheProvider === 'node-cache') {
            NodeCache.flushAll()
        }
    }

    // GET
    if (action === 'get') {
        // LRU
        if (cacheProvider === 'LRU') {
            doCallback(callback, LRUCache.get(hash))
        }

        // REDIS
        if (cacheProvider === 'redis') {
            redisClient.get(hash, (err, result) => {
                exports.error(err)
                doCallback(callback, JSON.parse(result))
            })
        }

        // NATIVE
        if (cacheProvider === 'native') {
            doCallback(callback, nativeCache.hash)
        }

        // MMAP
        if (cacheProvider === 'mmap') {
            if (MMAPObject.hash !== undefined) {
                doCallback(callback, JSON.parse(MMAPObject.hash))
            } else {
                doCallback(callback, null)
            }
        }

        // NODE-CACHE
        if (cacheProvider === 'node-cache') {
            NodeCache.get(hash, (err, result) => {
                exports.error(err)
                doCallback(callback, result)
            })
        }
    }

    // SET
    if (action === 'set') {
        // LRU
        if (cacheProvider === 'LRU') {
            LRUCache.set(hash, val, ttl)
            doCallback(callback, true)
        }

        // REDIS
        if (cacheProvider === 'redis') {
            redisClient.set(hash, JSON.stringify(val))
        }

        // NATIVE
        if (cacheProvider === 'native') {
            nativeCache.hash = val
        }

        // MMAP
        if (cacheProvider === 'mmap') {
            MMAPObject.hash = JSON.stringify(val)
        }

        // NODE-CACHE
        if (cacheProvider === 'node-cache') {
            NodeCache.set(hash, val)
        }
    }
}

exports.init = config => {
    exports.pool = mysql.createPool({
        host:              config.host,
        user:              config.user,
        password:          config.password,
        database:          config.database,
        connectionLimit:   config.connectionLimit,
        supportBigNumbers: true,
    })

    exports.TTL             = config.TTL
    exports.verboseMode     = config.verbose
    exports.cacheMode       = config.caching
    exports.connectionLimit = config.connectionLimit

    if (config.hasOwnProperty('cacheProvider') === false) {
        exports.error('No cache provider given, please check the documentation if you have just updated this package https://github.com/michaeldegroot/mysql-cache/')
    }

    let found = false

    for (let i = supportedCacheProviders.length - 1; i >= 0; i--) {
        if (config.cacheProvider.toLowerCase() === supportedCacheProviders[i].toLowerCase()) {
            found = supportedCacheProviders[i]
        }
    }
    if (found === false) {
        exports.error('Unknown cacheProvider: ' + config.cacheProvider)
    } else {
        cacheProvider = found
        if (found === 'redis') {
            redisClient = redis.createClient()
            redisClient.on('error', function (err) {
                exports.error('Redis error: ' + err)
            })
        }

        if (found === 'mmap') {
            MMAPObject = new MMAPCache.Create('mysqlcache')
        }
    }
}

exports.TTL             = 0
exports.prefix          = 'mysql-cache'
exports.ready           = false
exports.lastTrace       = null
exports.cacheShow       = 0
exports.poolConnections = 0
exports.querys          = 0
exports.totalquerys     = 0
exports.QPM             = 0

exports.queryPerSec = () => {
    setInterval(() => {
        exports.QPM    = exports.querys
        exports.querys = 0
    }, 1000)
}
exports.queryPerSec()

exports.flushAll = () => {
    cacheAction('flush')
    exports.trace('Cache Flushed')
}

exports.stats = () => {
    exports.trace('-----------------------')
    exports.trace(colors.yellow(exports.prefix + ': ') + ' Statistics')
    exports.trace('Open Pool Connections: ' + exports.poolConnections)
    exports.trace('Requests Per Second: ' + exports.QPM)
    if (exports.QPM >= 100) {
        exports.trace('**** ' + colors.red('QUERY PER SEC IS HIGH'))
    }
    if (exports.poolConnections >= exports.connectionLimit) {
        exports.trace('**** ' + colors.red('MYSQL POOL CONNECTION LIMIT REACHED'))
    }
    exports.trace('-----------------------')
}

exports.query = (sql, params, callback, data) => {
    exports.lastTrace = getStackTrace()
    const cacheMode   = exports.cacheMode
    let query

    exports.querys++

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
    }
    const type = query.split(' ')[0].toLowerCase()
    let TTLSet = 0

    query = mysql.format(query, params)

    if (type.toLowerCase() === 'select') {
        const hash = crypto.createHash('sha512').update(query).digest('hex')

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
                if (exports.verboseMode) {
                    exports.trace(colors.yellow(hash) + '-' + colors.green(query))
                }
                if (callback) {
                    callback(null, cache)
                }
            } else {
                if (exports.verboseMode) {
                    exports.trace(colors.yellow(hash) + '-' + colors.red(query))
                }
                exports.getPool(connection => {
                    connection.query(sql, params, (err, rows) => {
                        exports.endPool(connection)
                        if (err) {
                            exports.endPool(connection)
                            callback(err, null)

                            return false
                        }
                        if (data) {
                            if (data.TTL) {
                                TTLSet = data.TTL
                            }
                        } else {
                            TTLSet = exports.TTL
                        }
                        exports.createKey(hash, rows, TTLSet)
                        callback(null, rows)
                    })
                })
            }
        })
    } else {
        exports.getPool(connection => {
            connection.query(sql, params, (err, rows) => {
                exports.endPool(connection)
                if (err) {
                    callback(err)

                    return false
                }
                exports.trace('warn', query)
                callback(null, rows)
            })
        })
    }
}

const createId = id => {
    return id.replace(/ /g, '').toLowerCase()
}

exports.delKey = (id, params) => {
    id = mysql.format(id, params)
    const hash = crypto.createHash('sha512').update(id).digest('hex')

    cacheAction('remove', hash)
}

exports.getKey = (id, callback) => {
    cacheAction('get', createId(id), null, null, callback)
}

exports.createKey = (id, val, ttl) => {
    if (ttl) {
        exports.TTL = ttl
    }
    cacheAction('set', createId(id), val, exports.TTL)
}

exports.changeDB = (data, cb) => {
    exports.getPool(connection => {
        connection.changeUser(data, err => {
            exports.endPool(connection)
            if (err) {
                exports.trace('warn', 'Could not change database connection settings.')
                doCallback(cb, err)

                return
            }
            exports.trace('Successfully changed database connection settings')
            doCallback(cb, null, true)
        })
    })
}

const getStackTrace = () => {
    const obj = {}

    Error.captureStackTrace(obj, getStackTrace)

    return obj.stack
}

exports.getPool = cb => {
    exports.pool.getConnection((err, connection) => {
        exports.error(err)

        exports.poolConnections++
        cb(connection)
    })
}

exports.endPool = connection => {
    if (exports.poolConnections === 0) {
        return false
    }
    exports.poolConnections--
    connection.release()

    return true
}

exports.trace = text => {
    if (exports.verboseMode) {
        console.log(colors.green('MYSQL-CACHE') + ': ' + text)
    }
}

exports.error = err => {
    if (err) {
        console.log(colors.red('MYSQL-CACHE FATAL ERROR') + ': ' + err)
        throw new Error(console.trace())
    }
}

const doCallback = (cb, args) => {
    if (typeof cb === 'function') {
        cb(args)
    } else {
        return false
    }
}

exports.testConnection = cb => {
    exports.pool.getConnection((err, connection) => {
        if (err) {
            exports.trace(err.code)
            exports.trace('Trying to reconnect in 3 seconds.')
            setTimeout(() => {
                exports.testConnection(() => {

                })
            }, 3000)

            return
        } else {
            exports.trace('Connected to DB')
            exports.ready = true
            doCallback(cb, true)
        }
    })
}
