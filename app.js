'use strict'

const mysql         = require('mysql')
const colors        = require('colors')
const crypto        = require('crypto')
const cacheProvider = require('./cacheprovider/app')
const util          = require('./util')

exports.init = (config, cb) => {
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
        util.error('No cache provider given, please check the documentation if you have just updated this package https://github.com/michaeldegroot/mysql-cache/')
    }

    cacheProvider.setup(config)

    // Check connection
    exports.pool.getConnection(function(err, connection) {
        util.error(err)
        exports.endPool(connection)
        let showConfig = JSON.parse(JSON.stringify(config))

        showConfig.password = showConfig.password.replace(/./gi, '*')
        util.trace(JSON.stringify(showConfig))
        util.trace(colors.green('Connected!'))
        if (cb) {
            cb(true)
        }
    })
}

exports.TTL             = 0
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
    cacheProvider.run('flush')
    util.trace('Cache Flushed')
}

exports.stats = () => {
    util.trace('-----------------------')
    util.trace('Open Pool Connections: ' + exports.poolConnections)
    util.trace('Requests Per Second: ' + exports.QPM)
    if (exports.QPM >= 100) {
        util.trace('**** ' + colors.red('QUERY PER SEC IS HIGH'))
    }
    if (exports.poolConnections >= exports.connectionLimit) {
        util.trace('**** ' + colors.red('MYSQL POOL CONNECTION LIMIT REACHED'))
    }
    util.trace('-----------------------')
}

exports.query = (sql, params, callback, data) => {
    exports.lastTrace = util.getStackTrace()
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
                    util.trace(colors.yellow(hash) + '-' + colors.green(query))
                }
                if (callback) {
                    callback(null, cache)
                }
            } else {
                if (exports.verboseMode) {
                    util.trace(colors.yellow(hash) + '-' + colors.red(query))
                }
                exports.getPool(connection => {
                    connection.query(sql, params, (err, rows) => {
                        exports.endPool(connection)
                        util.error(err)
                        if (data) {
                            if (data.TTL) {
                                TTLSet = data.TTL
                            }
                        } else {
                            TTLSet = exports.TTL
                        }
                        exports.createKey(hash, rows, TTLSet, () => {
                            callback(null, rows)
                        })
                    })
                })
            }
        })
    } else {
        exports.getPool(connection => {
            connection.query(sql, params, (err, rows) => {
                util.error(err)
                exports.endPool(connection)
                util.trace('warn', query)
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

    cacheProvider.run('remove', hash)
}

exports.getKey = (id, cb) => {
    cacheProvider.run('get', createId(id), null, null, cb)
}

exports.createKey = (id, val, ttl, cb) => {
    if (ttl) {
        exports.TTL = ttl
    }
    cacheProvider.run('set', createId(id), val, exports.TTL, cb)
}

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

exports.getPool = cb => {
    exports.pool.getConnection((err, connection) => {
        util.error(err)

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

exports.testConnection = cb => {
    exports.pool.getConnection((err, connection) => {
        if (err) {
            util.trace(err.code)
            util.trace('Trying to reconnect in 3 seconds.')
            setTimeout(() => {
                exports.testConnection(() => {

                })
            }, 3000)

            return
        } else {
            util.trace('Connected to DB')
            exports.ready = true
            util.doCallback(cb, true)
        }
    })
}
