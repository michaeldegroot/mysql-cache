'use strict'

const util = require('../util')
const path = require('path')

let cache

exports.getSelfName = () => {
    return path.basename(__filename).replace('.js', '')
}

exports.setup = config => {
    util.trace(`Setting up ${exports.getSelfName()} cacheProvider`)

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
}

exports.set = (obj, cb) => {
    try {
        cache[obj.hash] = JSON.stringify(obj.val)
    } catch (e) {
        util.error('Could not JSON.stringify value' + e.toString())
    }
    process.nextTick(() => {
        util.doCallback(cb, true)
    })
}

exports.get = (obj, cb) => {
    if (cache[obj.hash] !== undefined) {
        try {
            JSON.parse(cache[obj.hash])
        } catch (e) {
            util.error('Could not JSON.parse result: ' + e.toString())
        }
        util.doCallback(cb, JSON.parse(cache[obj.hash]))
    } else {
        util.doCallback(cb, null)
    }
}

exports.remove = (obj, cb) => {
    delete cache[obj.hash]
}
