'use strict'

const appRoot       = require('app-root-path')
const async         = require('async')
const settings      = require(appRoot + '/settings').settings()
const db            = require(appRoot + '/app')
const speedteststep = require(appRoot + '/speedteststep')

exports.run = (set, amount, cache, cb) => {
    settings.verbose       = false
    settings.cacheProvider = set
    settings.caching       = cache

    db.init(settings, () => {
        db.flushAll()

        let amountArray = []

        for (let i = 0; i < amount; i++) {
            amountArray.push(i)
        }

        async.eachSeries(amountArray, function iteratee(item, innerCallback) {
            db.query('SELECT ? + ? AS solution', [1, 6], result => {
                process.nextTick(() => {
                    speedteststep.tick()
                    innerCallback()
                })
            })
        }, function done() {
            setTimeout(cb, 100)
        })
    })
}
