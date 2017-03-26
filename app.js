'use strict'

// Take a moment to rejoice the fact how this code looks now versus this:
// https://github.com/michaeldegroot/mysql-cache/blob/4739b184c5d397e901775cbf68f938168af8dadc/app.js

// Requires
const colors        = require('colors')
const crypto        = require('crypto')
const events        = require('events')
const extend        = require('extend')
const Promise       = require('bluebird')
const CacheProvider = require('./lib/cacheProvider')
const moment        = require('moment')
const checkNested   = require('check-nested')
const install       = require('install-package')

// Some constants
const poolPrefix = colors.cyan('Pool')

class MysqlCache {
    constructor(config) {
        // Promisify all functions, they can now be accessed by FunctionNameHereAsync()
        Promise.promisifyAll(this, {
            multiArgs: true,
        })

        // Merge default settings with user settings
        this.config = extend({
            TTL:                0,
            verbose:            false,
            caching:            true,
            cacheProvider:      'lru',
            connectionLimit:    1000,
            supportBigNumbers:  true,
            hashing:            'farmhash64',
            prettyError:        true,
            cacheProviderSetup: {
                // Default memcached setting
                serverLocation: '127.0.0.1:11211',
            },
        }, config)

        // Setup class properties
        this.event           = new events.EventEmitter()
        this.mysql           = require('mysql2')
        this.hits            = 0
        this.misses          = 0
        this.queries         = 0
        this.inserts         = 0
        this.poolConnections = 0
        this.deletes         = 0
        this.selects         = 0
        this.updates         = 0
        this.cacheProvider   = new CacheProvider(this, this.config)
        this.cacheProviders  = this.cacheProvider.getAll()
    }

    /**
     * Prints text
     */
    trace(text) {
        if (this.config.hasOwnProperty('verbose')) {
            if (this.config.verbose) {
                console.log(colors.bold('MYSQL-CACHE') + ': ' + text)

                return true
            }

            return false
        }
    }

    /**
     * Connect to the database
     */
    connect(cb) {
        // Create a mysql connection pool with the configured
        this.pool = this.mysql.createPool(this.config)

        // Create the connection
        this.pool.getConnection((err, connection) => {
            if (err) {
                return cb(err)
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
     * Disconnects from the database by killing the pool
     */
    disconnect(cb) {
        this.killPool(err => {
            if (err) {
                return cb(err)
            }

            this.trace(`${colors.bold(colors.red('Disconnected'))} from ${colors.bold('MySQL')}`)

            return cb(null, true)
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
     * Uses or installs a package
     */
    usePackage(moduleName, cb) {
        try {
            require.resolve(moduleName)
        } catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                this.trace(`Module ${moduleName} not installed, installing...`)

                return install(moduleName).then(result => {
                    cb(result.stderr, require(moduleName))
                }).catch(e => {
                    cb(e, null)
                })
            } else {
                throw new Error(e)
            }
        }

        return cb(null, require(moduleName))
    }

    /**
     * Flushes all cache
     */
    flush(cb) {
        cb = this.defineCallback(cb)

        return this.cacheProvider.run({
            action: 'flush',
        }, err => {
            if (err) {
                return cb(err)
            }

            this.event.emit('flush')
            this.trace('Cache Flushed')

            return cb(null, true)
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
     * A Request to query the database comes in
     * @param    {Object}   sql
     * @param    {Object}   params
     * @param    {Function} cb
     * @param    {Object}   data
     */
    query(sql, params, cb, data) {
        this.queries++
        let query
        let zone = 'DEFAULT_MYSQL_CACHE_ZONE'

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

        if (sql.hasOwnProperty('zone')) {
            zone = sql.zone
        }

        if (data) {
            if (data.hasOwnProperty('zone')) {
                zone = data.zone
            }
        }

        // A query can be called without a callback
        cb = this.defineCallback(cb)

        // Determine the query type: SELECT, UPDATE, etc
        const type = query.split(' ')[0].toLowerCase()

        // Let the mysql package forumulate the query object and send a event emit
        query = this.mysql.format(query, params)
        this.event.emit('query', query)

        // Find out what to do next with this query
        // This parameter object is used by multiple functions including: miss, hit and dbQuery
        return this.defineCache({
            sql,
            query,
            type,
            params,
            data,
            zone,
        }, cb)
    }

    /**
     * Defines a cache object
     */
    defineCache(obj, cb) {
        this.trace(colors.bold(obj.type.toUpperCase()) + ' ' + colors.grey(colors.bold(obj.query)))

        if (obj.type === 'insert') {
            this.inserts++
        }

        if (obj.type === 'update') {
            this.updates++
        }

        if (obj.type === 'delete') {
            this.deletes++
        }

        if (obj.type === 'select') {
            return this.createHash(obj.query, (err, hash) => {
                if (err) {
                    return cb(err)
                }

                // Updates the hash property of this mysql cache object
                obj.hash = hash

                this.selects++

                // Retrieve the cache key

                return this.getKey(hash, (err, result) => {
                    if (err) {
                        return cb(err)
                    }

                    // Set the cache result
                    obj.result = result

                    // If there is a cacheProvider result we should return the cache HIT
                    if (obj.result) {
                        // Can refresh the cache object if specified
                        if (obj.sql.hasOwnProperty('refreshCache')) {
                            if (obj.sql.refreshCache === true) {
                                return this.miss(obj, cb)
                            }
                        }

                        return this.hit(obj, cb)
                    }

                    // Make the cache query MISS
                    return this.miss(obj, cb)
                })
            })
        }

        return this.dbQuery(obj, (err, result) => {
            if (err) {
                return cb(err)
            }

            // Set the database result
            obj.result = result

            // This is not cached
            obj.isCache = false

            return cb(null, this.mysqlObject(obj).result, this.mysqlObject(obj).cache)
        })
    }

    /**
     * Hits a query call
     */
    hit(obj, cb) {
        obj.isCache = true
        this.event.emit('hit', obj)
        this.trace(colors.yellow(obj.hash.slice(0, 15)) + ' ' + colors.green(colors.bold('HIT')))
        this.hits++

        return cb(null, this.mysqlObject(obj).result, this.mysqlObject(obj).cache)
    }

    /**
     * Misses a query call
     */
    miss(obj, cb) {
        obj.isCache = false
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

        return this.dbQuery(obj, (err, result) => {
            if (err) {
                return cb(err)
            }

            // Sets the cache result
            obj.result = result

            this.event.emit('miss', obj, result)

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
                return cb(null, this.mysqlObject(obj).result, this.mysqlObject(obj).cache)
            }

            // Create a cache key for future references
            return this.createKey(obj.hash, result, TTLSet, obj.zone, (err, keyResult) => {
                if (err) {
                    return cb(err)
                }

                return cb(null, this.mysqlObject(obj).result, this.mysqlObject(obj).cache)
            })
        })
    }

    /**
     * Generates a object that mysqlCache exposes after a .query cb
     */
    mysqlObject(obj) {
        let newObj = {
            cache: {},
        }

        if (checkNested(obj, 'cache.created') === false) {
            newObj.cache.created = moment().unix()
        }

        newObj.result = obj.result

        newObj.cache  = {
            isCache: obj.isCache,
            hash:    obj.hash,
            sql:     obj.query,
        }

        return newObj
    }

    /**
     * Handles pool connection and queries the database
     */
    dbQuery(obj, cb) {
        return this.getPool((err, connection) => {
            if (err) {
                return cb(err)
            }
            this.event.emit('dbQuery', obj)
            connection.query(obj.sql, obj.params, (err, rows) => {
                if (err) {
                    return cb(err)
                }
                this.endPool(connection)

                return cb(null, rows)
            })
        })
    }

    /**
     * How a hash id is created from scratch
     * @param    {String}   id
     */
    createHash(id, cb) {
        id = String(id)
        id = id.replace(/ /g, '')
        id = id.toLowerCase()

        let hash = null

        if (this.config.hashing === 'xxhash') {
            return this.usePackage('xxhash', (err, module) => {
                if (err) {
                    this.trace(`Warning when installing module 'xxhash': ${err}`)
                }

                return cb(null, module.hash(new Buffer(id), 0xCAFEBABE).toString())
            })
        }

        if (this.config.hashing === 'farmhash32') {
            return this.usePackage('farmhash', (err, module) => {
                if (err) {
                    this.trace(`Warning when installing module 'farmhash': ${err}`)
                }

                return cb(null, module.hash32(id).toString())
            })
        }

        if (this.config.hashing === 'farmhash64') {
            return this.usePackage('farmhash', (err, module) => {
                if (err) {
                    this.trace(`Warning when installing module 'farmhash': ${err}`)
                }

                return cb(null, module.hash64(id).toString())
            })
        }

        try {
            hash = crypto.createHash(this.config.hashing).update(id).digest('hex')
        } catch (error) {
            return cb('Undefined hash method: ' + this.config.hashing)
        }

        cb(null, hash)
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

        return this.createHash(this.mysql.format(id, params), (err, hash) => {
            if (err) {
                return cb(err)
            }

            this.event.emit('delete', hash)

            return this.cacheProvider.run({
                action: 'remove',
                hash,
            }, (err, result) => {
                cb(err, result)
            })
        })
    }

    /**
     * Retrieves a cache object by key
     * @param    {String}   hash
     * @param    {Function} cb
     */
    getKey(hash, cb) {
        this.event.emit('get', hash)

        return this.cacheProvider.run({
            action: 'get',
            hash,
        }, (err, result) => {
            return cb(err, result)
        })
    }

    /**
     * Creates a cache object
     * @param    {String}   hash
     * @param    {Object}   val
     * @param    {Number}   ttl
     * @param    {Function} cb
     */
    createKey(hash, val, ttl, zone, cb) {
        this.event.emit('create', hash, val, ttl)

        return this.cacheProvider.run({
            action: 'set',
            hash,
            val,
            ttl,
            zone,
        }, (err, result) => {
            return cb(err, result)
        })
    }

    /**
     * Clears a cache zone
     * @param    {String}   Zone name
     * @param    {Function} cb
     */
    clearZone(zone, cb) {
        return this.cacheProvider.run({
            action: 'clearzone',
            zone,
        }, err => {
            return cb(err)
        })
    }

    /**
     * Create or get a pool connection
     * @param    {Function} cb
     */
    getPool(cb) {
        return this.pool.getConnection((err, connection) => {
            if (err) {
                return cb(err)
            }

            this.event.emit('getPool', connection)
            this.poolConnections = this.pool._allConnections.length

            return cb(null, connection)
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

        return this.pool.getConnection((err, connection) => {
            if (err) {
                return cb(err)
            }

            return this.pool.end(err => {
                if (err) {
                    return cb(err)
                }

                this.trace(`${poolPrefix}: Pool is killed`)
                this.event.emit('killPool')

                return cb(null, true)
            })
        })
    }
}

module.exports = MysqlCache
