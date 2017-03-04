'use strict'

const Memcached = require('memcached')
let memcached

exports.setup = config => {
    memcached = new Memcached(config.cacheProviderSetup.serverLocation, config.cacheProviderSetup.options)
}

exports.flush = (obj, cb) => {
    memcached.flush(err => {
        cb(err, true)
    })
}

exports.set = (obj, cb) => {
    memcached.set(obj.hash, obj.val, obj.ttl / 1000, err => {
        cb(err, true)
    })
}

exports.get = (obj, cb) => {
    memcached.get(obj.hash, (err, data) => {
        cb(err, data)
    })
}

exports.remove = (obj, cb) => {
    memcached.del(obj.hash, err => {
        cb(err, true)
    })
}
