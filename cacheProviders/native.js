'use strict'

const appRoot        = require('app-root-path')
const util           = require(appRoot + '/util')
const CachemanMemory = require('cacheman-memory')
const path           = require('path')

let cache

exports.getSelfName = () => {
    return path.basename(__filename).replace('.js', '')
}

exports.setup = config => {
    util.trace(`Setting up ${exports.getSelfName()} cacheProvider`)
    cache = new CachemanMemory({
        ttl:    config.ttl,
        engine: 'memory',
    })
}

exports.flush = (obj, cb) => {
    cache.clear()
}

exports.set = (obj, cb) => {
    cache.set(obj.hash, obj.val, obj.ttl / 1000, err => {
        util.error(err)
        util.doCallback(cb, true)
    })
}

exports.get = (obj, cb) => {
    cache.get(obj.hash, (err, result) => {
        util.error(err)
        util.doCallback(cb, result)
    })
}

exports.remove = (obj, cb) => {
    cache.del(obj.hash)
}
