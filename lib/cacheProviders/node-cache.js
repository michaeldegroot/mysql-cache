'use strict'

const NodeCache = require('node-cache')

let cache

exports.setup = config => {
    cache = new NodeCache({
        stdTTL:      config.TTL,
        checkperiod: 120,
    })
}

exports.flush = (obj, cb) => {
    cache.flushAll()

    process.nextTick(() => {
        cb(null, true)
    })
}

exports.set = (obj, cb) => {
    cache.set(obj.hash, obj.val, (err, success) => {
        if (err) {
            return cb(err)
        }

        if (obj.ttl === 0) {
            return cb(null, true)
        }

        cache.ttl(obj.hash, obj.ttl / 1000, (err, changed) => {
            cb(err, changed)
        })
    })
}

exports.get = (obj, cb) => {
    process.nextTick(() => {
        cache.get(obj.hash, (err, result) => {
            cb(err, result)
        })
    })
}

exports.remove = (obj, cb) => {
    cache.del(obj.hash)

    process.nextTick(() => {
        cb(null, true)
    })
}
