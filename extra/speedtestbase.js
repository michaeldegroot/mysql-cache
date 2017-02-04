'use strict'

const async         = require('async')
const settings      = require('../settings').settings()
const db            = require('../app')
const speedteststep = require('./speedteststep')

exports.run = (set, amount, cache, cb) => {
    settings.verbose       = false
    settings.cacheProvider = set
    settings.caching       = cache

    db.init(settings, () => {
        db.flushAll(err => {
            if (err) {
                throw new Error(err)
            }

            let amountArray = []

            for (let i = 0; i < amount; i++) {
                amountArray.push(i)
            }

            async.eachOfLimit(amountArray, 5, function iteratee(value, key, innerCallback) {
                db.query('SELECT ? + ? AS solution', [1, 6], result => {
                    speedteststep.tick()
                    innerCallback()
                })
            }, function done() {
                cb()
            })
        })
    })
}
