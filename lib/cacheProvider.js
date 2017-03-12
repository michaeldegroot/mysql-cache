'use strict'

const fs      = require('fs')
const path    = require('path')
const colors  = require('colors')
const Promise = require('bluebird')

class CacheProvider {
    constructor(parent, config) {
        // Promisify all functions, they can now be accessed by FunctionNameHereAsync()
        Promise.promisifyAll(this)

        this.parent              = parent
        this.cacheProviderSource = null
        this.cacheProvider       = null
        this.supportedCacheProviders = []
        this.provider = null

        // Find supported cacheProviders
        this.cacheProviderFiles = fs.readdirSync(path.join(__dirname, 'cacheProviders'))
        for (let i in this.cacheProviderFiles) {
            if (path.extname(this.cacheProviderFiles[i]) === '.js') {
                this.supportedCacheProviders.push(this.cacheProviderFiles[i].replace('.js', ''))
            }
        }

        // Boolean if cacheProvider was found
        let found = false

        for (let i = this.supportedCacheProviders.length - 1; i >= 0; i--) {
            if (config.cacheProvider.toLowerCase() === this.supportedCacheProviders[i].toLowerCase()) {
                found = this.supportedCacheProviders[i]
            }
        }
        if (found === false) {
            throw new Error('Unknown cacheProvider: ' + config.cacheProvider)
        } else {
            this.cacheProvider       = found
            exports.provider    = this.cacheProvider
            this.cacheProviderSource = require('./cacheProviders/' + found)

            this.verifyFunction(this.cacheProviderSource, 'setup', err => {
                if (err) {
                    throw new Error(err)
                }
                this.cacheProviderSource.setup(config)
            })
        }
    }

    getAll() {
        return this.supportedCacheProviders
    }

    verifyFunction(obj, func, cb) {
        if (typeof obj[func] === 'function') {
            return cb(null, true)
        }

        return cb(`Function '${func}' does not exists for cacheProvider '${this.cacheProvider}'`)
    }

    run(obj, cb) {
        if (!obj.hash) {
            obj.hash = ''
        }

        this.parent.trace(colors.green('CacheProvider') + ': ' + this.cacheProvider + ' ' + obj.action.toUpperCase() + ' ' + obj.hash.slice(0, 12))

        return this.verifyFunction(this.cacheProviderSource, obj.action, err => {
            if (err) {
                return cb(err)
            }

            return this.cacheProviderSource[obj.action](obj, (err, result) => {
                if (err) {
                    return cb(err)
                }

                return cb(null, result)
            })
        })
    }
}

module.exports = CacheProvider
