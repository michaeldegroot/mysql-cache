'use strict'

const CachemanMemory = require('cacheman-memory')

let cache

exports.setup = config => {
    cache = new CachemanMemory({
        ttl:    config.ttl,
        engine: 'memory',
    })
}

exports.flush = (obj, cb) => {
    cache.clear(err => {
        cb(err, true)
    })
}

exports.set = (obj, cb) => {
    cache.set(obj.hash, obj.val, obj.ttl / 1000, err => {
        cb(err, true)
    })
}

exports.get = (obj, cb) => {
    cache.get(obj.hash, (err, result) => {
        cb(err, result)
    })
}

exports.remove = (obj, cb) => {
    cache.del(obj.hash, err => {
        cb(err, true)
    })
}
