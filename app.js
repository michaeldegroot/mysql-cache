'use strict'

const colors        = require('colors')
const crypto        = require('crypto')
const events        = require('events')
const extend        = require('extend')
const Util          = require('./lib/util')

// Some Constants
const poolPrefix = colors.cyan('Pool')

class MysqlCache {
    constructor(config) {
        this.event           = new events.EventEmitter()
        this.util            = new Util(config)
        this.cacheProvider   = require('./lib/cacheProvider')
        this.mysql           = require('mysql2')
        this.cacheProviders  = this.cacheProvider.getAll()
        this.hits            = 0
        this.misses          = 0
        this.queries         = 0
        this.inserts         = 0
        this.poolConnections = 0
        this.deletes         = 0
        this.selects         = 0
        this.updates         = 0
        this.config          = null
        this.ranInit         = false

        // Merge default settings with user settings
        this.config = extend({
            TTL:               0,
            verbose:           false,
            caching:           true,
            cacheProvider:     'lru',
            connectionLimit:   1000,
            supportBigNumbers: true,
            hashing:           'sha512',
            prettyError:       true,
            stdoutErrors:      false,
        }, config)

        // Let util know of the state of verboseMode
        this.util.verboseMode = this.config.verbose

        // Show the configuration in verbose mode
        const showConfig = JSON.parse(JSON.stringify(this.config))

        showConfig.password = showConfig.password.replace(/./gi, '*')
        this.util.trace(JSON.stringify(showConfig))

        // Create a mysql connection pool with the configured
        this.pool = this.mysql.createPool(this.config)

        // Test the connection before continuing
        this.pool.getConnection((err, connection) => {
            if (err) {
                this.util.error(err)
            } else {
                // Setup the cacheProvider chosen
                this.cacheProvider.setup(this.config)

                this.util.trace(`${colors.bold(colors.green('Connected'))} to ${colors.bold('MySQL')} as ${colors.bold(this.config.user)}@${colors.bold(this.config.host)} with the ${colors.bold(this.config.cacheProvider)} cacheProvider`)
                this.ranInit = true
                this.endPool(connection)

                // Verbose output pool events of the mysql package
                this.pool.on('acquire', connection => {
                    this.poolConnections = this.pool._allConnections.length
                    this.util.trace(`${poolPrefix}: recieved connection with id ${connection.threadId}`)
                })

                this.pool.on('connection', connection => {
                    this.poolConnections = this.pool._allConnections.length
                    this.util.trace(`${poolPrefix}: Connection established with id ${connection.threadId}`)
                })

                this.pool.on('enqueue', () => {
                    this.poolConnections = this.pool._allConnections.length
                    this.util.trace('${poolPrefix}: Waiting for available connection slot')
                })

                this.pool.on('release', connection => {
                    this.poolConnections = this.pool._allConnections.length
                    this.util.trace(`${poolPrefix}: Connection ${connection.threadId} released`)
                })

                this.event.emit('connected')
            }
        })
    }

    /**
     * Flushes all cache
     */
    flush(cb) {
        // a flush cannot be called without a callback
        if (typeof cb !== 'function') {
            this.util.error('flush was called without a callback which is unsupported, use a callback for your flush function')
        } else {
            this.cacheProvider.run('flush', null, null, null, (err, result) => {
                if (err) {
                    this.util.error(err, cb)
                } else {
                    this.event.emit('flush')
                    this.util.trace('Cache Flushed')
                    cb(null, true)
                }
            })
        }
    }

    flushAll(cb) {
        return this.flush(cb)
    }

    /**
     * Returns some statistics about mysql-cache
     */
    stats(object) {
        if (object) {
            return {
                poolConnections: this.pool._allConnections.length,
                hits:            this.hits,
                misses:          this.misses,
                total:           this.queries,
                selects:         this.selects,
                inserts:         this.inserts,
                updates:         this.updates,
                deletes:         this.deletes,
            }
        } else {
            this.util.trace('Open Pool Connections: ' + this.pool._allConnections.length)
            this.util.trace('Cache Hits: ' + this.hits)
            this.util.trace('Cache Misses: ' + this.misses)
            this.util.trace('Total Queries: ' + this.queries)
            this.util.trace('Total Select Statements: ' + this.selects)
            this.util.trace('Total Insert Statements: ' + this.inserts)
            this.util.trace('Total Update Statements: ' + this.updates)
            this.util.trace('Total Remove Statements: ' + this.deletes)
        }
    }

    /**
     * Query the database and cache the result, or retrieve the value from cache straight away
     * @param    {Object}   sql
     * @param    {Object}   params
     * @param    {Function} cb
     * @param    {Object}   data
     */
    query(sql, params, cb, data) {
        this.queries++
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
            params = []
            if (sql.hasOwnProperty('params')) {
                params = sql.params
            }
        }

        // A query can be called without a callback
        if (!cb) {
            cb = () => {
                // Empty callback
            }
        }

        const type = query.split(' ')[0].toLowerCase()
        let TTLSet = 0

        query = this.mysql.format(query, params)
        this.event.emit('query', query)
        const hash = this.createHash(query)

        this.util.trace(colors.bold(type.toUpperCase()) + ' ' + colors.yellow(hash.slice(0, 15)) + ' ' + colors.grey(colors.bold(query)))

        if (type === 'insert') {
            this.inserts++
        }

        if (type === 'update') {
            this.updates++
        }

        if (type === 'delete') {
            this.deletes++
        }

        if (type === 'select') {
            this.selects++

            this.getKey(hash, (err, dbProviderResult) => {
                if (err) {
                    this.util.error(err, cb)
                } else {
                    if (dbProviderResult) {
                        this.event.emit('hit', query, hash, dbProviderResult)
                        this.util.trace(colors.yellow(hash.slice(0, 15)) + ' ' + colors.green(colors.bold('HIT')))
                        this.hits++
                        cb(null, dbProviderResult, this.generateObject(true, hash, query))
                    } else {
                        let doCache = true

                        if (sql.hasOwnProperty('cache')) {
                            if (sql.cache === false) {
                                doCache = false
                            }
                        }

                        this.util.trace(colors.yellow(hash.slice(0, 15)) + ' ' + colors.red(colors.bold('MISS')))
                        this.misses++
                        this.dbQuery(sql, params, (err, result) => {
                            if (err) {
                                this.util.error(err, cb)
                            } else {
                                this.event.emit('miss', query, hash, result)

                                TTLSet = this.config.TTL * 1000
                                if (data) {
                                    if (data.hasOwnProperty('TTL')) {
                                        TTLSet = data.TTL * 1000
                                    }
                                    if (data.hasOwnProperty('cache')) {
                                        if (data.cache === false) {
                                            doCache = false
                                        }
                                    }
                                }

                                if (!this.config.caching || !doCache) {
                                    cb(null, result, this.generateObject(false, hash, query))
                                } else {
                                    this.createKey(hash, result, TTLSet, (err, keyResult) => {
                                        if (err) {
                                            this.util.error(err, cb)
                                        } else {
                                            cb(null, result, this.generateObject(false, hash, query))
                                        }
                                    })
                                }
                            }
                        })
                    }
                }
            })
        } else {
            this.dbQuery(sql, params, (err, result) => {
                if (err) {
                    this.util.error(err, cb)
                } else {
                    cb(null, result)
                }
            })
        }
    }

    /**
     * Generates a object that mysqlCache exposes after a .query cb
     */
    generateObject(isCache, hash, sql) {
        return {
            isCache,
            hash,
            sql,
        }
    }

    /**
     * Handles pool connection and queries the database
     */
    dbQuery(sql, params, cb) {
        this.getPool((err, connection) => {
            if (err) {
                this.util.error(err, cb)
            } else {
                connection.query(sql, params, (err, rows) => {
                    if (err) {
                        this.util.error(err, cb)
                    } else {
                        this.endPool(connection)
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
    createHash(id) {
        id = String(id)
        id = id.replace(/ /g, '')
        id = id.toLowerCase()

        let hash = null

        try {
            hash = crypto.createHash(this.config.hashing).update(id).digest('hex')
        } catch (error) {
            this.util.error('Undefined hash method: ' + this.config.hashing)
        }

        return hash
    }

    /**
     * Deletes a cache object by key
     * @param    {Object}   id
     * @param    {Object}   params
     */
    delKey(id, params, cb) {
        if (typeof params === 'function' && typeof id === 'object') {
            cb = params
        }

        // a delKey cannot be called without a callback
        if (typeof cb !== 'function' || cb === undefined) {
            this.util.error('delKey was called without a callback which is unsupported, use a callback for your delKey function')
        } else {
            if (typeof id === 'object') {
                params = id['params']
                id     = id['sql']
            }

            const hash = this.createHash(this.mysql.format(id, params))

            this.event.emit('delete', hash)
            this.cacheProvider.run('remove', hash, null, null, (err, result) => {
                if (err) {
                    this.util.error(err, cb)
                } else {
                    cb(null, result)
                }
            })
        }
    }

    /**
     * Retrieves a cache object by key
     * @param    {Object}   id
     * @param    {Function} cb
     */
    getKey(id, cb) {
        this.event.emit('get', id)
        this.cacheProvider.run('get', id, null, null, (err, result) => {
            if (err) {
                this.util.error(err, cb)
            } else {
                cb(null, result)
            }
        })
    }

    /**
     * Creates a cache object
     * @param    {Object}   id
     * @param    {Object}   val
     * @param    {Number}   ttl
     * @param    {Function} cb
     */
    createKey(id, val, ttl, cb) {
        this.event.emit('create', id, val, ttl)
        this.cacheProvider.run('set', id, val, ttl, (err, result) => {
            if (err) {
                this.util.error(err, cb)
            } else {
                cb(null, result)
            }
        })
    }

    /**
     * Create or get a pool connection
     * @param    {Function} cb
     */
    getPool(cb) {
        this.pool.getConnection((err, connection) => {
            if (err) {
                this.util.error(err, cb)
            } else {
                this.event.emit('getPool', connection)
                this.poolConnections = this.pool._allConnections.length
                cb(null, connection)
            }
        })
    }

    /**
     * Kill a pool connection
     * @param    {Object} connection
     */
    endPool(connection) {
        if (connection) {
            connection.release()
            this.event.emit('endPool', connection)
            this.poolConnections = this.pool._allConnections.length

            return true
        }

        return false
    }

    /**
     * Kills the pool
     * @param    {Function} cb
     */
    killPool(cb) {
        // killPool can be called without a callback
        if (!cb) {
            cb = () => {
                // Empty callback
            }
        }

        this.pool.getConnection((err, connection) => {
            if (err) {
                this.util.error(err, cb)
            } else {
                this.pool.end(err => {
                    if (err) {
                        this.util.error(err, cb)
                    } else {
                        this.util.trace(`${poolPrefix}: Pool is killed`)
                        this.event.emit('killPool')
                        cb(null, true)
                    }
                })
            }
        })
    }
}

module.exports = MysqlCache
