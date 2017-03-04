'use strict'

const Memcached = require('memcached')
let memcached

exports.setup = config => {
    memcached = new Memcached(config.cacheProviderSetup.serverLocation, config.cacheProviderSetup.options)
}

exports.flush = (obj, cb) => {
    memcached.flush(err => {
        if (err) {
            cb(err)
        } else {
            cb(null, true)
        }
    })
}

exports.set = (obj, cb) => {
    memcached.set(obj.hash, obj.val, obj.ttl / 1000, err => {
        if (err) {
            cb(err)
        } else {
            cb(null, true)
        }
    })
}

exports.get = (obj, cb) => {
    memcached.get(obj.hash, (err, data) => {
        if (err) {
            cb(err)
        } else {
            cb(null, data)
        }
    })
}

exports.remove = (obj, cb) => {
    memcached.del(obj.hash, err => {
        if (err) {
            cb(err)
        } else {
            cb(null, true)
        }
    })
}
