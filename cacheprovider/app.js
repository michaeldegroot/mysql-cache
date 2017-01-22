'use strict'

const util = require('../util')

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

// NATIVE
let nativeCache = {}

const supportedCacheProviders = [
    'LRU',
    'mmap',
    'redis',
    'node-cache',
    'native',
]

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
                console.log(require.resolve('mmap-object'))
            } catch (e) {
                util.error('mmap-object is not installed on this system. You need to install it manually to use this as a cacheProvider')
            }

            MMAPCache = require('mmap-object')
            MMAPObject = new MMAPCache.Create('mysqlcache')
        }
    }
}

exports.run = (action, hash, val, ttl, callback) => {
    util.trace('cacheProvider ' + cacheProvider + ' ' + action.toUpperCase())

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
            nativeCache = {}
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
            delete nativeCache.hash
            actionHit = true
        }

        // MMAP
        if (cacheProvider === 'mmap') {
            delete MMAPObject.hash
            actionHit = true
        }

        // NODE-CACHE
        if (cacheProvider === 'node-cache') {
            NodeCache.del(hash)
            actionHit = true
        }
    }

    // GET
    if (action === 'get') {
        // LRU
        if (cacheProvider === 'LRU') {
            util.doCallback(callback, LRUCache.get(hash))
        }

        // REDIS
        if (cacheProvider === 'redis') {
            redisClient.get(hash, (err, result) => {
                util.error(err)
                util.doCallback(callback, JSON.parse(result))
            })
            actionHit = true
        }

        // NATIVE
        if (cacheProvider === 'native') {
            util.doCallback(callback, nativeCache.hash)
            actionHit = true
        }

        // MMAP
        if (cacheProvider === 'mmap') {
            if (MMAPObject.hash !== undefined) {
                util.doCallback(callback, JSON.parse(MMAPObject.hash))
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
    }

    // SET
    if (action === 'set') {
        // LRU
        if (cacheProvider === 'LRU') {
            LRUCache.set(hash, val, ttl)
            process.nextTick(() => {
                util.doCallback(callback, true)
            })
            actionHit = true
        }

        // REDIS
        if (cacheProvider === 'redis') {
            redisClient.set(hash, JSON.stringify(val), err => {
                util.error(err)
                util.doCallback(callback, true)
            })
        }

        // NATIVE
        if (cacheProvider === 'native') {
            nativeCache.hash = val
            process.nextTick(() => {
                util.doCallback(callback, true)
            })
            actionHit = true
        }

        // MMAP
        if (cacheProvider === 'mmap') {
            MMAPObject.hash = JSON.stringify(val)
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
