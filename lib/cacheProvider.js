'use strict'

const fs     = require('fs')
const Util   = require('./util')
const path   = require('path')
const colors = require('colors')

let util

let cacheProviderSource
let cacheProvider

const supportedCacheProviders = []

exports.provider = null

// Find supported cacheProviders
let cacheProviderFiles

try {
    cacheProviderFiles = fs.readdirSync(path.join(__dirname, 'cacheProviders'))
} catch (e) {
    throw e
}

for (let i in cacheProviderFiles) {
    if (path.extname(cacheProviderFiles[i]) === '.js') {
        supportedCacheProviders.push(cacheProviderFiles[i].replace('.js', ''))
    }
}

exports.getAll = () => {
    return supportedCacheProviders
}

const verifyFunction = (obj, func) => {
    if (typeof obj[func] === 'function') {
        return true
    } else {
        throw new Error(`Function '${func}' does not exists for cacheProvider '${cacheProvider}'`)
    }
}

exports.setup = config => {
    let found = false

    util = new Util(config)

    for (let i = supportedCacheProviders.length - 1; i >= 0; i--) {
        if (config.cacheProvider.toLowerCase() === supportedCacheProviders[i].toLowerCase()) {
            found = supportedCacheProviders[i]
        }
    }
    if (found === false) {
        util.error('Unknown cacheProvider: ' + config.cacheProvider)
    } else {
        cacheProvider       = found
        exports.provider    = cacheProvider
        cacheProviderSource = require('./cacheProviders/' + found)

        if (verifyFunction(cacheProviderSource, 'setup')) {
            cacheProviderSource.setup(config)
        }
    }
}

exports.run = (action, hash, val, ttl, cb) => {
    // Do not run if the cacheProvider has not been set yet.
    if (typeof cacheProvider === 'undefined') {
        return false
    }

    // a cacheprovider run function cannot be called without a callback
    if (typeof cb !== 'function' || cb === undefined) {
        util.error('cacheProvider run was called without a callback, which is unsupported.')
    }

    let extra = ''

    if (hash) {
        extra += ' ' + hash.slice(0, 12)
    }

    if (val) {
        extra += ' TO ' + JSON.stringify(val, null, 4)
        if (ttl !== 0) {
            extra +=  ' WITH TTL ' + ttl
        }
    }

    util.trace(colors.green('CacheProvider') + ': ' + cacheProvider + ' ' + action.toUpperCase() + extra)

    if (verifyFunction(cacheProviderSource, action)) {
        cacheProviderSource[action]({
            hash,
            val,
            ttl,
        }, (err, result) => {
            if (err) {
                cb(err)
            } else {
                cb(null, result)
            }
        })
    }
}
