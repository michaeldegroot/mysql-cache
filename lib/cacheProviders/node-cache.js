'use strict'

const util      = require('../util')
const path      = require('path')
const NodeCache = require('node-cache')

let cache

exports.getSelfName = () => {
    return path.basename(__filename).replace('.js', '')
}

exports.setup = config => {
    util.trace(`Setting up ${exports.getSelfName()} cacheProvider`)
    cache = new NodeCache({
        stdTTL:      config.TTL,
        checkperiod: 120,
    })
}

exports.flush = (obj, cb) => {
    cache.flushAll()
}

exports.set = (obj, cb) => {
    cache.set(obj.hash, obj.val, (err, success) => {
        if (!success) {
            util.error('Could not save value to node-cache')
        }

        if (obj.ttl === 0) {
            util.doCallback(cb, err, true)
        } else {
            cache.ttl(obj.hash, obj.ttl / 1000, (err, changed) => {
                if (changed) {
                    util.doCallback(cb, err, true)
                }
            })
        }
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
