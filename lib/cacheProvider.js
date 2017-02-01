'use strict'

const fs      = require('fs')
const util    = require('./util')
const path    = require('path')

let cacheProviderSource
let cacheProvider

const supportedCacheProviders = []

// Find supported cacheProviders
const cacheProviderFiles = fs.readdirSync(path.join(__dirname, 'cacheProviders'))

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
        util.error(`Function '${func}' does not exists for cacheProvider '${cacheProvider}'`)
    }
}

exports.setup = config => {
    let found = false

    for (let i = supportedCacheProviders.length - 1; i >= 0; i--) {
        if (config.cacheProvider.toLowerCase() === supportedCacheProviders[i].toLowerCase()) {
            found = supportedCacheProviders[i]
        }
    }
    if (found === false) {
        util.error('Unknown cacheProvider: ' + config.cacheProvider)
    } else {
        cacheProvider       = found
        cacheProviderSource = require('./cacheProviders/' + found)

        if (verifyFunction(cacheProviderSource, 'setup')) {
            cacheProviderSource.setup(config)
        }
    }
}

exports.run = (action, hash, val, ttl, callback) => {
    // Do not run if the cacheProvider has not been set yet.
    if (typeof cacheProvider === 'undefined') {
        return false
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

    util.trace('CacheProvider: ' + cacheProvider + ' ' + action.toUpperCase() + extra)

    if (verifyFunction(cacheProviderSource, action)) {
        cacheProviderSource[action]({
            hash,
            val,
            ttl,
        }, result => {
            util.doCallback(callback, result)
        })
    }
}
