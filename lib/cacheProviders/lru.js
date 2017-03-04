'use strict'

const LRU = require('lru-cache')

let cache = LRU()

exports.setup = config => {
}

exports.flush = (obj, cb) => {
    cache.reset()

    process.nextTick(() => {
        cb(null, true)
    })
}

exports.set = (obj, cb) => {
    cache.set(obj.hash, obj.val, obj.ttl)
    cb(null, true)
}

exports.get = (obj, cb) => {
    cb(null, cache.get(obj.hash))
}

exports.remove = (obj, cb) => {
    cache.del(obj.hash)

    process.nextTick(() => {
        cb(null, true)
    })
}
