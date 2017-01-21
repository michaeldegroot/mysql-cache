const mysql   = require('mysql')
const colors  = require('colors')
const crypto  = require('crypto')
const cluster = require('cluster')
const md5sum  = crypto.createHash('md5')
const LRU     = require('lru-cache')
const cache   = LRU()

exports.init = config => {
    exports.pool = mysql.createPool({
        host:              config.host,
        user:              config.user,
        password:          config.password,
        database:          config.database,
        connectionLimit:   config.connectionLimit,
        supportBigNumbers: true
    })
    exports.TTL             = config.TTL
    exports.verboseMode     = config.verbose
    exports.cacheMode       = config.caching
    exports.connectionLimit = config.connectionLimit
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
    },1000)
}
exports.queryPerSec()

exports.flushAll = () => {
    cache.reset()
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
    cacheMode         = exports.cacheMode

    exports.querys++

    if (typeof params === 'function') {
        data     = callback
        callback = params
        params   = []
        query    = sql
    }else{
        query = sql
    }
    if (typeof sql === 'object') {
        query = sql.sql
    }
    const type = query.split(' ')[0].toLowerCase()

    query = mysql.format(query, params)

    if (type.toLowerCase() == 'select') {
        const hash = crypto.createHash('md5').update(query).digest('hex')

        exports.getKey(hash, (cache) => {
            if (!cacheMode) {
                cache = false
            }
            if (data) {
                if (data.cache == false) {
                    cache = false
                }
            }
            if (cache) {
                if (exports.verboseMode) {
                    exports.trace(colors.yellow(hash) + '-' + colors.green(query))
                }
                if (callback) {
                    callback(null,cache)
                }
            }else{
                if (exports.verboseMode) {
                    exports.trace(colors.yellow(hash) + '-' + colors.red(query))
                }
                exports.getPool(connection => {
                    connection.query(sql, params, (err, rows) => {
                        exports.endPool(connection)
                        if (err) {
                            exports.endPool(connection)
                            callback(err,null)
                            return false
                        }
                        if (data) {
                            TTLSet = 0
                            if (data.TTL) {
                                TTLSet = data.TTL
                            }
                        }else{
                            TTLSet = exports.TTL
                        }
                        exports.createKey(hash, rows, TTLSet)
                        callback(null, rows)
                    })
                })
            }
        })
    }else{
        exports.getPool(connection => {
            connection.query(sql,params, (err, rows) => {
                exports.endPool(connection)
                if (err) {
                    callback(err)
                    return false
                }
                exports.trace('warn',query)
                callback(null,rows)
            })
        })
    }
}

exports.delKey = (id, params) => {
    id = mysql.format(id, params)
    const hash = crypto.createHash('md5').update(id).digest('hex')
    cache.del(hash)
}

exports.getKey = (id, callback) => {
    id = id.replace(/ /g, '').toLowerCase()
    callback(cache.get(id))
}

exports.createKey = (id, val, ttl) => {
  id = id.replace(/ /g,'').toLowerCase()
    const oldTTL = exports.TTL
    if (ttl) exports.TTL = ttl
    cache.set(id, val, exports.TTL)
}

exports.changeDB = (data, cb) => {
    exports.getPool(connection => {
        connection.changeUser(data, err => {
            exports.endPool(connection)
            if (err) {
                exports.trace('warn','Could not change database connection settings.')
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
    if (exports.poolConnections == 0) {
        return false
    }
    exports.poolConnections--
    connection.release()
    return true
}

exports.trace = text => {
    if (exports.verboseMode) {
        console.log(text)
    }
}

exports.error = err => {
    if (err) {
        console.log('FATAL ERROR: ' + err)
        process.exit()
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
