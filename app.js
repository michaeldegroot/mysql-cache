'use strict'

// Take a moment to rejoice the fact how this code looks now versus this:
// https://github.com/michaeldegroot/mysql-cache/blob/4739b184c5d397e901775cbf68f938168af8dadc/app.js

// Requires
const colors      = require('colors')
const crypto      = require('crypto')
const events      = require('events')
const extend      = require('extend')
const Promise     = require('bluebird')

// Some constants
const poolPrefix = colors.cyan('Pool')

class MysqlCache {
    constructor(config) {
        this.event           = new events.EventEmitter()
        this.mysql           = require('mysql2')
        this.cacheProvider   = require('./lib/cacheProvider')
        this.cacheProviders  = this.cacheProvider.getAll()
        this.hits            = 0
        this.misses          = 0
        this.queries         = 0
        this.inserts         = 0
        this.poolConnections = 0
        this.deletes         = 0
        this.selects         = 0
        this.updates         = 0

        // Merge default settings with user settings
        this.config = extend({
            TTL:                0,
            verbose:            false,
            caching:            true,
            cacheProvider:      'lru',
            connectionLimit:    1000,
            supportBigNumbers:  true,
            hashing:            'sha512',
            prettyError:        true,
            promise:            true,
            cacheProviderSetup: {
                // Default memcached setting
                serverLocation: '127.0.0.1:11211',
            },
        }, config)

        this.trace = text => {
            if (this.config.hasOwnProperty('verbose')) {
                if (this.config.verbose) {
                    console.log(colors.bold('MYSQL-CACHE') + ': ' + text)
                }
            }
        }

        if (this.config.promise) {
            Promise.promisifyAll(this)
        }

        // Set parents
        this.cacheProvider.setParent(this)

        // Setup the cacheProvider chosen
        this.cacheProvider.setup(this.config)
    }

    /**
     * Prints text
     */
    trace(text) {
        this.trace(text)
    }

    /**
     * Creates a error object
     */
    error(err) {
        if (err instanceof Error) {
            return err
        } else {
            return new Error(err)
        }
    }

    /**
     * Connect to the database
     */
    connect(cb) {
        // Create a mysql connection pool with the configured
        this.pool = this.mysql.createPool(this.config)

        // Test the connection before continuing
        this.pool.getConnection((err, connection) => {
            if (err) {
                return cb(this.error(err))
            }

            this.trace(`${colors.bold(colors.green('Connected'))} to ${colors.bold('MySQL')} as ${colors.bold(this.config.user)}@${colors.bold(this.config.host)} with the ${colors.bold(this.config.cacheProvider)} cacheProvider`)
            if (this.endPool(connection)) {
                // Verbose output pool events of the mysql package
                this.pool.on('acquire', connection => {
                    this.poolConnections = this.pool._allConnections.length
                    this.trace(`${poolPrefix}: recieved connection with id ${connection.threadId}`)
                })

                this.pool.on('connection', connection => {
                    this.poolConnections = this.pool._allConnections.length
                    this.trace(`${poolPrefix}: Connection established with id ${connection.threadId}`)
                })

                this.pool.on('enqueue', () => {
                    this.poolConnections = this.pool._allConnections.length
                    this.trace('${poolPrefix}: Waiting for available connection slot')
                })

                this.pool.on('release', connection => {
                    this.poolConnections = this.pool._allConnections.length
                    this.trace(`${poolPrefix}: Connection ${connection.threadId} released`)
                })

                this.event.emit('connected')
                cb(null, true)
            }
        })
    }

    /**
     * A placeholder callback for undefined callbacks
     */
    defineCallback(cb) {
        if (!cb) {
            return () => {
                return 'woot'
            }
        }

        return cb
    }

    /**
     * Flushes all cache
     */
    flush(cb) {
        cb = this.defineCallback(cb)
        this.cacheProvider.run('flush', null, null, null, (err, result) => {
            if (err) {
                cb(this.error(err))
            } else {
                this.event.emit('flush')
                this.trace('Cache Flushed')
                cb(null, true)
            }
        })
    }

    flushAll(cb) {
        return this.flush(this.defineCallback(cb))
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
            this.trace('Open Pool Connections: ' + this.pool._allConnections.length)
            this.trace('Cache Hits: ' + this.hits)
            this.trace('Cache Misses: ' + this.misses)
            this.trace('Total Queries: ' + this.queries)
            this.trace('Total Select Statements: ' + this.selects)
            this.trace('Total Insert Statements: ' + this.inserts)
            this.trace('Total Update Statements: ' + this.updates)
            this.trace('Total Remove Statements: ' + this.deletes)
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
        cb = this.defineCallback(cb)

        const type = query.split(' ')[0].toLowerCase()

        query = this.mysql.format(query, params)
        this.event.emit('query', query)
        const hash = this.createHash(query)

        this.trace(colors.bold(type.toUpperCase()) + ' ' + colors.yellow(hash.slice(0, 15)) + ' ' + colors.grey(colors.bold(query)))

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

            // Retrieve the cache key
            return this.getKey(hash, (err, cacheProviderResult) => {
                if (err) {
                    return cb(this.error(err))
                }

                const cacheObject = {
                    sql,
                    params,
                    hash,
                    query,
                    cacheProviderResult,
                    data,
                    cb,
                }

                // If there is a cacheProvider result we should return the cache HIT
                if (cacheProviderResult) {
                    // Can refresh the cache object if specified
                    if (sql.hasOwnProperty('refreshCache')) {
                        if (sql.refreshCache === true) {
                            return this.miss(cacheObject)
                        }
                    }

                    return this.hit(cacheObject)
                }

                // Make the cache query MISS
                this.miss(cacheObject)
            })
        }

        this.dbQuery(sql, params, (err, result) => {
            if (err) {
                return cb(this.error(err))
            }

            cb(null, extend(result, this.generateObject(false, hash, query)))
        })
    }
    /**
     * Hits a query call
     */
    hit(obj) {
        this.event.emit('hit', obj.query, obj.hash, obj.cacheProviderResult)
        this.trace(colors.yellow(obj.hash.slice(0, 15)) + ' ' + colors.green(colors.bold('HIT')))
        this.hits++

        obj.cb(null, extend(obj.cacheProviderResult, this.generateObject(true, obj.hash, obj.query)))
    }

    /**
     * Misses a query call
     */
    miss(obj) {
        let TTLSet = 0

        this.trace(colors.yellow(obj.hash.slice(0, 15)) + ' ' + colors.red(colors.bold('MISS')))
        this.misses++

        // Will this query be cached?
        let doCache = true

        if (obj.sql.hasOwnProperty('cache')) {
            if (obj.sql.cache === false) {
                doCache = false
            }
        }

        this.dbQuery(obj.sql, obj.params, (err, result) => {
            if (err) {
                return obj.cb(this.error(err))
            }

            this.event.emit('miss', obj.query, obj.hash, result)

            // Figure out some parameters configurations for this query
            TTLSet = this.config.TTL * 1000
            if (obj.data) {
                if (obj.data.hasOwnProperty('TTL')) {
                    TTLSet = obj.data.TTL * 1000
                }
                if (obj.data.hasOwnProperty('cache')) {
                    if (obj.data.cache === false) {
                        doCache = false
                    }
                }
            }

            // If we don't want to cache then just return the result without creating a cache key
            if (!this.config.caching || !doCache) {
                return obj.cb(null, extend(result, this.generateObject(false, obj.hash, obj.query)))
            }

            // Create a cache key for future references
            this.createKey(obj.hash, result, TTLSet, (err, keyResult) => {
                if (err) {
                    return obj.cb(this.error(err))
                }

                obj.cb(null, extend(result, this.generateObject(false, obj.hash, obj.query)))
            })
        })
    }

    /**
     * Generates a object that mysqlCache exposes after a .query cb
     */
    generateObject(isCache, hash, sql) {
        return {
            _cache: {
                isCache,
                hash,
                sql,
            },
        }
    }

    /**
     * Handles pool connection and queries the database
     */
    dbQuery(sql, params, cb) {
        cb = this.defineCallback(cb)
        this.getPool((err, connection) => {
            if (err) {
                return cb(this.error(err))
            }
            connection.query(sql, params, (err, rows) => {
                if (err) {
                    return cb(this.error(err))
                }
                this.endPool(connection)
                cb(null, rows)
            })
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
            throw new Error('Undefined hash method: ' + this.config.hashing)
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
        cb = this.defineCallback(cb)
        if (typeof id === 'object') {
            params = id['params']
            id     = id['sql']
        }

        const hash = this.createHash(this.mysql.format(id, params))

        this.event.emit('delete', hash)
        this.cacheProvider.run('remove', hash, null, null, (err, result) => {
            cb(err, result)
        })
    }

    /**
     * Retrieves a cache object by key
     * @param    {Object}   id
     * @param    {Function} cb
     */
    getKey(id, cb) {
        cb = this.defineCallback(cb)
        this.event.emit('get', id)
        this.cacheProvider.run('get', id, null, null, (err, result) => {
            cb(err, result)
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
            cb(err, result)
        })
    }

    /**
     * Create or get a pool connection
     * @param    {Function} cb
     */
    getPool(cb) {
        this.pool.getConnection((err, connection) => {
            if (err) {
                cb(this.error(err))
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
        cb = this.defineCallback(cb)

        this.pool.getConnection((err, connection) => {
            if (err) {
                cb(this.error(err))
            } else {
                this.pool.end(err => {
                    if (err) {
                        cb(this.error(err))
                    } else {
                        this.trace(`${poolPrefix}: Pool is killed`)
                        this.event.emit('killPool')
                        cb(null, true)
                    }
                })
            }
        })
    }
}

module.exports = MysqlCache
