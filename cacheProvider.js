'use strict'

const appRoot = require('app-root-path')
const util    = require(appRoot + '/util')

let cacheProvider

// LRU
const LRU      = require('lru-cache')
const LRUCache = LRU()

// MMAP
let MMAPCache
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

// FILE
const Cacheman = require('cacheman-file')
let fileCache

// NATIVE
const NodeTtl     = require('node-ttl')
const nativeCache = new NodeTtl()

const supportedCacheProviders = [
    'LRU',
    'mmap',
    'redis',
    'node-cache',
    'file',
    'native',
]

exports.getAll = () => {
    return supportedCacheProviders
}

exports.setup = config => {
    let found = false

    for (let i = supportedCacheProviders.length - 1; i >= 0; i--) {
        if (config.cacheProvider.toLowerCase() === supportedCacheProviders[i].toLowerCase()) {
            found = supportedCacheProviders[i]
        }
    }
    if (found === false) {
        util.error('Unknown cacheProvider: ' + config.cacheProvider)
    } else {
        cacheProvider = found
        if (found === 'redis') {
            redisClient = redis.createClient()
            redisClient.on('error', function (err) {
                util.error('Redis error: ' + err)
            })
        }
        if (found === 'mmap') {
            try {
                require.resolve('mmap-object')
            } catch (e) {
                throw new Error('mmap-object is not installed on this system. You need to install it manually to use this as a cacheProvider')
            }

            MMAPCache = require('mmap-object')
            MMAPObject = new MMAPCache.Create('mysqlcache')
        }

        if (found === 'file') {
            fileCache = new Cacheman('mysqlcache', {
                ttl:    config.ttl,
                engine: 'in file',
            })
        }
    }
}

exports.run = (action, hash, val, ttl, callback) => {
    // Do not run if the cacheProvider has not been set yet.
    if (typeof cacheProvider === 'undefined') {
        return false
    }

    util.trace('cacheProvider ' + cacheProvider + ' ' + action.toUpperCase() + ' with a TTL of ' + ttl)

    let actionHit = false

    // FLUSH
    if (action === 'flush') {
        // LRU
        if (cacheProvider === 'LRU') {
            LRUCache.reset()
            actionHit = true
        }

        // REDIS
        if (cacheProvider === 'redis') {
            redisClient.flushdb()
            actionHit = true
        }

        // NATIVE
        if (cacheProvider === 'native') {
            nativeCache.clear()
            actionHit = true
        }

        // MMAP
        if (cacheProvider === 'mmap') {
            MMAPObject = {}
            actionHit = true
        }

        // NODE-CACHE
        if (cacheProvider === 'node-cache') {
            NodeCache.flushAll()
            actionHit = true
        }

        // FILE
        if (cacheProvider === 'file') {
            fileCache.clear()
            actionHit = true
        }
    }

    // REMOVE
    if (action === 'remove') {
        // LRU
        if (cacheProvider === 'LRU') {
            LRUCache.del(hash)
            actionHit = true
        }

        // REDIS
        if (cacheProvider === 'redis') {
            LRUCache.del(hash)
            actionHit = true
        }

        // NATIVE
        if (cacheProvider === 'native') {
            nativeCache.del(hash)
            actionHit = true
        }

        // MMAP
        if (cacheProvider === 'mmap') {
            delete MMAPObject[hash]
            actionHit = true
        }

        // NODE-CACHE
        if (cacheProvider === 'node-cache') {
            NodeCache.del(hash)
            actionHit = true
        }

        // FILE
        if (cacheProvider === 'file') {
            fileCache.del(hash)
            actionHit = true
        }
    }

    // GET
    if (action === 'get') {
        // LRU
        if (cacheProvider === 'LRU') {
            util.doCallback(callback, LRUCache.get(hash))
            actionHit = true
        }

        // REDIS
        if (cacheProvider === 'redis') {
            redisClient.get(hash, (err, result) => {
                util.error(err)
                try {
                    JSON.parse(result)
                } catch (e) {
                    util.error('Could not JSON.parse result: ' + e.toString())
                }
                util.doCallback(callback, JSON.parse(result))
            })
            actionHit = true
        }

        // NATIVE
        if (cacheProvider === 'native') {
            util.doCallback(callback, nativeCache.get(hash))
            actionHit = true
        }

        // MMAP
        if (cacheProvider === 'mmap') {
            if (MMAPObject[hash] !== undefined) {
                try {
                    JSON.parse(MMAPObject[hash])
                } catch (e) {
                    util.error('Could not JSON.parse result: ' + e.toString())
                }
                util.doCallback(callback, JSON.parse(MMAPObject[hash]))
            } else {
                util.doCallback(callback, null)
            }
            actionHit = true
        }

        // NODE-CACHE
        if (cacheProvider === 'node-cache') {
            NodeCache.get(hash, (err, result) => {
                util.error(err)
                util.doCallback(callback, result)
            })
            actionHit = true
        }

        // FILE
        if (cacheProvider === 'file') {
            fileCache.get(hash, (err, result) => {
                util.error(err)
                util.doCallback(callback, result)
            })
            actionHit = true
        }
    }

    // SET
    if (action === 'set') {
        // LRU
        if (cacheProvider === 'LRU') {
            LRUCache.set(hash, val, ttl)
            util.doCallback(callback, true)
            actionHit = true
        }

        // REDIS
        if (cacheProvider === 'redis') {
            try {
                JSON.stringify(val)
            } catch (e) {
                util.error('Could not JSON.stringify value: ' + e.toString())
            }

            redisClient.set(hash, JSON.stringify(val), err => {
                util.error(err)
                util.doCallback(callback, true)
            })
            if (ttl / 1000 >= 1) {
                redisClient.expire(hash, ttl / 1000)
            }
            actionHit = true
        }

        // NATIVE
        if (cacheProvider === 'native') {
            nativeCache.push(hash, val, null, ttl / 1000)
            process.nextTick(() => {
                util.doCallback(callback, true)
            })
            actionHit = true
        }

        // MMAP
        if (cacheProvider === 'mmap') {
            try {
                MMAPObject[hash] = JSON.stringify(val)
            } catch (e) {
                util.error('Could not JSON.stringify value' + e.toString())
            }
            process.nextTick(() => {
                util.doCallback(callback, true)
            })
            actionHit = true
        }

        // NODE-CACHE
        if (cacheProvider === 'node-cache') {
            NodeCache.set(hash, val, (err, success) => {
                util.error(err)
                if (!success) {
                    util.error('Could not save value to node-cache')
                }

                NodeCache.ttl(hash, ttl / 1000, (err, changed) => {
                    util.error(err)
                    if (changed) {
                        callback()
                    }
                })
            })
            actionHit = true
        }

        // FILE
        if (cacheProvider === 'file') {
            fileCache.set(hash, val, ttl / 1000, (err, value) => {
                util.error(err)
                util.doCallback(callback, true)
            })
            actionHit = true
        }
    }

    // CHECK
    if (actionHit !== true) {
        util.error('Action not completed, missing condition for action ' + action + ' with cacheProvider: ' + cacheProvider)
    }
}
