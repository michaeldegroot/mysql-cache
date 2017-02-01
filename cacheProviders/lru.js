'use strict'

const appRoot = require('app-root-path')
const util    = require(appRoot + '/util')
const path    = require('path')
const LRU     = require('lru-cache')

let cache = LRU()

exports.getSelfName = () => {
    return path.basename(__filename).replace('.js', '')
}

exports.setup = config => {
    util.trace(`Setting up ${exports.getSelfName()} cacheProvider`)
}

exports.flush = (obj, cb) => {
    cache.reset()
}

exports.set = (obj, cb) => {
    cache.set(obj.hash, obj.val, obj.ttl)
    util.doCallback(cb, true)
}

exports.get = (obj, cb) => {
    util.doCallback(cb, cache.get(obj.hash))
}

exports.remove = (obj, cb) => {
    cache.del(obj.hash)
}
