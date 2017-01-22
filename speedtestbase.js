'use strict'

const async    = require('async')
const settings = require('./test/settings').settings()
const db       = require('./app')

exports.run = (set, amount, cache, callback) => {
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
            db.query('SELECT ? + ? AS solution', [1, 6], (err, resultMysql) => {
                innerCallback()
            })
        }, function done() {
            callback()
        })
    })
}
