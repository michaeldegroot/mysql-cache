'use strict'

const flatfile = require('flat-file-db')
const path     = require('path')

let cache

exports.setup = config => {
    cache = flatfile.sync(path.join(process.cwd(), 'mysqlcache.db'))
}

exports.flush = (obj, cb) => {
    cache.clear()

    cb(null, true)
}

exports.set = (obj, cb) => {
    cache.put(obj.hash, obj.val)

    cb(null, true)
}

exports.get = (obj, cb) => {
    cb(null, cache.get(obj.hash))
}

exports.remove = (obj, cb) => {
    cache.del(obj.hash, err => {
        cb(err, true)
    })
}
