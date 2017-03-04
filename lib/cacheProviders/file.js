'use strict'

const CachemanFile = require('cacheman-file')

let cache

exports.setup = config => {
    cache = new CachemanFile('mysqlcache', {
        ttl:    config.ttl,
        engine: 'in file',
    })
}

exports.flush = (obj, cb) => {
    cache.clear(err => {
        if (err) {
            cb(err)
        } else {
            cb(null, true)
        }
    })
}

exports.set = (obj, cb) => {
    cache.set(obj.hash, obj.val, obj.ttl / 1000, err => {
        if (err) {
            cb(err)
        } else {
            cb(null, true)
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
    cache.del(obj.hash, err => {
        if (err) {
            cb(err)
        } else {
            cb(null, true)
        }
    })
}
