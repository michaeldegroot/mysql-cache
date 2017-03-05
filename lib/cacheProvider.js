'use strict'

const fs     = require('fs')
const path   = require('path')
const colors = require('colors')

let parent

let cacheProviderSource
let cacheProvider

const supportedCacheProviders = []

exports.provider = null

// Find supported cacheProviders
let cacheProviderFiles

cacheProviderFiles = fs.readdirSync(path.join(__dirname, 'cacheProviders'))

for (let i in cacheProviderFiles) {
    if (path.extname(cacheProviderFiles[i]) === '.js') {
        supportedCacheProviders.push(cacheProviderFiles[i].replace('.js', ''))
    }
}

exports.setParent = newParent => {
    parent = newParent
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

    for (let i = supportedCacheProviders.length - 1; i >= 0; i--) {
        if (config.cacheProvider.toLowerCase() === supportedCacheProviders[i].toLowerCase()) {
            found = supportedCacheProviders[i]
        }
    }
    if (found === false) {
        throw new Error('Unknown cacheProvider: ' + config.cacheProvider)
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
    if (!hash) {
        hash = ''
    }

    parent.trace(colors.green('CacheProvider') + ': ' + cacheProvider + ' ' + action.toUpperCase() + hash.slice(0, 12))

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
