const cluster    = require('cluster')
const memored    = require('memored')

if (cluster.isMaster) {
    cluster.fork()
}

const mysql     = require('mysql')
const colors    = require('colors')
const crypto    = require('crypto')
const md5sum    = crypto.createHash('md5')

exports.init = config => {
    if (!config.host) {
        exports.log('error', 'No host value supplied in configuration')
    }
    if (!config.user) {
        exports.log('error', 'No user value supplied in configuration')
    }
    if (!config.database) {
        exports.log('error', 'No database value supplied in configuration')
    }
    if (!config.connectionLimit) {
        exports.log('error', 'No connectionLimit value supplied in configuration')
    }
    if (!config.password) {
        exports.log('warn', 'No password value supplied in configuration')
    }

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

    memored.setup({
        purgeInterval: exports.TTL
    })

    exports.testConnection()
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
    memored.clean()
    exports.log('success', 'Cache Flushed')
}

exports.stats = () => {
    console.log('-----------------------')
    console.log(colors.yellow(exports.prefix + ': ') + ' Statistics')
    console.log('Open Pool Connections: ' + exports.poolConnections)
    console.log('Requests Per Second: ' + exports.QPM)
    if (exports.QPM >= 100) {
        console.log('**** ' + colors.red('QUERY PER SEC IS HIGH'))
    }
    if (exports.poolConnections >= exports.connectionLimit) {
        console.log('**** ' + colors.red('MYSQL POOL CONNECTION LIMIT REACHED'))
    }
    console.log('-----------------------')
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
                    console.log(colors.yellow(hash) + '-' + colors.green(query))
                }
                if (callback) {
                    callback(null,cache)
                }
            }else{
                if (exports.verboseMode) {
                	console.log(colors.yellow(hash) + '-' + colors.red(query))
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
                        exports.createKey(hash, rows, result => {
                            if (result) {
                                if (!callback) {
                                    return true
                                }
                                callback(null, rows)
                            }else{
                                callback('Cache key create failed')
                                return false
                            }
                        }, TTLSet)
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
                exports.log('warn',query)
                callback(null,rows)
            })
        })
    }
}

exports.delKey = (id, params) => {
    id = mysql.format(id, params)
    const hash = crypto.createHash('md5').update(id).digest('hex')
    memored.remove(hash)
}

exports.getKey = (id, callback) => {
    id = id.replace(/ /g, '').toLowerCase()
    memored.read(id, (err, value) => {
        if (err) {
            exports.log('warn', err)
        }
        callback(value)
    })
}

exports.createKey = (id, val, callback, ttl) => {
  id = id.replace(/ /g,'').toLowerCase()
    const oldTTL = exports.TTL
    if (ttl) exports.TTL = ttl
    memored.store(id, val, exports.TTL, () => {
        exports.TTL = oldTTL
        callback(true)
    })
}

exports.changeDB = (data,callback) => {
    exports.getPool(connection => {
        connection.changeUser(data, err => {
            exports.endPool(connection)
            if (err) {
                exports.log('warn','Could not change database connection settings.')
                callback(err)
                return
            }
            exports.log('success','Successfully changed database connection settings')
            callback(null,true)
        })
    })
}

const getStackTrace = () => {
  const obj = {}
  Error.captureStackTrace(obj, getStackTrace)
  return obj.stack
}

exports.getPool = callback => {
    exports.pool.getConnection((err, connection) => {
        if (err) {
            throw new Error(err)
        }

        exports.poolConnections++
        callback(connection)
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

exports.log = (type,text) => {
    if (type === 'error') throw new Error(text)

	if (!exports.verboseMode) {
		return
	}

    if (type === 'success') {
    	console.info(text)
    }
    if (type === 'info') {
    	console.info(text)
    }
    if (type === 'warn') {
    	console.warn(text)
    }
}

const doCallback = (cb, args) => {
	if (typeof cb === 'function') {
		cb(args)
	} else {
		return false
	}
}

exports.testConnection = (cb = false) => {
    exports.log('Connecting to DB')
    exports.pool.getConnection((err, connection) => {
   		exports.log('Got pool connection')
        if (err) {
            exports.log(err.code)
            exports.log('Trying to reconnect in 3 seconds.')
            setTimeout(() => {
                exports.testConnection(() => {

                })
            }, 3000)
            return
        }
        if (exports.endPool(connection)) {
            exports.log('success','Connected to DB')
            exports.ready = true
            doCallback(cb, true)
        } else {
            exports.log('warn', 'Could not connect to DB')
            doCallback(cb, false)
        }
    })
}
