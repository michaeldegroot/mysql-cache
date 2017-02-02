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
        if (err) {
            cb(err)
        } else {
            if (!success) {
                cb(new Error('Could not save value to node-cache'))
            } else {
                if (obj.ttl === 0) {
                    cb(null, true)
                } else {
                    cache.ttl(obj.hash, obj.ttl / 1000, (err, changed) => {
                        if (err) {
                            cb(err)
                        } else {
                            if (changed) {
                                cb(null, true)
                            } else {
                                cb(new Error('Could not change ttl of cache object: ' + obj))
                            }
                        }
                    })
                }
            }
        }
    })
}

exports.get = (obj, cb) => {
    cache.get(obj.hash, (err, result) => {
        if (err) {
            cb(err)
        } else {
            cb(null, result)
        }
    })
}

exports.remove = (obj, cb) => {
    cache.del(obj.hash)
}
