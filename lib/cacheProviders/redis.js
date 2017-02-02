'use strict'

const util          = require('../util')
const CachemanRedis = require('cacheman-redis')
const path          = require('path')

let cache

exports.getSelfName = () => {
    return path.basename(__filename).replace('.js', '')
}

exports.setup = config => {
    util.trace(`Setting up ${exports.getSelfName()} cacheProvider`)
    cache = new CachemanRedis({
        ttl:    config.ttl,
        engine: 'redis',
    })
}

exports.flush = (obj, cb) => {
    cache.clear()
}

exports.set = (obj, cb) => {
    cache.set(obj.hash, obj.val, obj.ttl / 1000, err => {
        util.doCallback(cb, err, true)
    })
}

exports.get = (obj, cb) => {
    cache.get(obj.hash, (err, result) => {
        util.doCallback(cb, err, result)
    })
}

exports.remove = (obj, cb) => {
    cache.del(obj.hash)
}
