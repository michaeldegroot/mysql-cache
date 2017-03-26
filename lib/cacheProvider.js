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
            exports.provider         = this.cacheProvider
            this.cacheProviderSource = require('./cacheProviders/' + found)

            this.verifyFunction(this.cacheProviderSource, 'setup', err => {
                if (err) {
                    throw new Error(err)
                }
                this.cacheProviderSource.setup(config, this.parent)
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

    clearZone(obj, cb) {
        this.parent.trace(colors.green('CacheProvider') + ': ' + this.cacheProvider + ' CLEARZONE ' + obj.zone)
        this.run({
            action: 'get',
            hash:   obj.zone,
        }, (err, result) => {
            if (err) {
                return cb(err)
            }

            const existingResult = JSON.parse(result)

            this.run({
                action: 'remove',
                hash:   obj.zone,
            }, (err, result) => {
                if (err) {
                    return cb(err)
                }
                const resultsLength = existingResult.length

                for (let i in existingResult) {
                    this.run({
                        action: 'remove',
                        hash:   existingResult[i],
                    }, (err, result) => {
                        if (err) {
                            return cb(err)
                        }

                        if (i >= resultsLength - 1) {
                            cb(null, true)
                        }
                    })
                }
            })
        })
    }

    zone(obj) {
        if (obj.zone !== 'DEFAULT_MYSQL_CACHE_ZONE') {
            this.run({
                action: 'get',
                hash:   obj.zone,
            }, (err, result) => {
                if (err) {
                    throw new Error(err)
                }

                let cacheZoneResult = JSON.stringify([
                    obj.hash,
                ])

                if (result) {
                    const existingResult = JSON.parse(result)

                    existingResult.push(obj.hash)
                    cacheZoneResult = JSON.stringify(existingResult)
                }

                this.run({
                    action:        'set',
                    innerZoneCall: true,
                    hash:          obj.zone,
                    ttl:           obj.ttl / 1000,
                    val:           cacheZoneResult,
                }, (err, result) => {
                    if (err) {
                        throw new Error(err)
                    }
                })
            })
        }
    }

    run(obj, cb) {
        if (!obj.hash) {
            obj.hash = ''
        }

        if (obj.action.toUpperCase() === 'SET') {
            if (obj.hasOwnProperty('innerZoneCall') === false) {
                this.zone(obj)
            }
        }

        if (obj.action.toUpperCase() === 'CLEARZONE') {
            return this.clearZone(obj, cb)
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
