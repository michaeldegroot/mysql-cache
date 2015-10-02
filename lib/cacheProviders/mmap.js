'use strict'

let cache

exports.setup = config => {
    try {
        require.resolve('mmap-object')
    } catch (e) {
        throw new Error('mmap-object is not installed on this system. You need to install it manually to use this as a cacheProvider')
    }

    const MMAPCache  = require('mmap-object')

    cache = new MMAPCache.Create('mysqlcache')
}

exports.flush = (obj, cb) => {
    cache = {}

    process.nextTick(() => {
        cb(null, true)
    })
}

exports.set = (obj, cb) => {
    try {
        cache[obj.hash] = JSON.stringify(obj.val)
    } catch (e) {
        cb(new Error('Could not JSON.stringify value' + e.toString()))

        return
    }

    cb(null, true)
}

exports.get = (obj, cb) => {
    if (cache[obj.hash] !== undefined) {
        try {
            JSON.parse(cache[obj.hash])
        } catch (e) {
            cb(new Error('Could not JSON.parse result: ' + e.toString()))

            return
        }
        cb(null, JSON.parse(cache[obj.hash]))
    } else {
        cb()
    }
}

exports.remove = (obj, cb) => {
    delete cache[obj.hash]

    process.nextTick(() => {
        cb(null, true)
    })
}
