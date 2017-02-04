'use strict'

const moment             = require('moment')
const async              = require('async')
const colors             = require('colors')
const speedteststep      = require('./speedteststep')
const settings           = require('../settings').settings()
const util               = require('../lib/util')
const db                 = require('../app')
const loopCacheProviders = db.cacheProviders

util.verboseMode = true

try {
    require.resolve('mmap-object')
    loopCacheProviders.push('mmap')
} catch (e) {
    util.trace('mmap-object is not installed on this system and will be skipped in this test.')
    for (let i in loopCacheProviders) {
        if (loopCacheProviders[i] === 'mmap') {
            loopCacheProviders.splice(i, 1)
            break
        }
    }
}

const resultsCache   = {}
const resultsNoCache = {}
let times            = 60

if (settings.host.toLowerCase() === 'localhost' || settings.host === '127.0.0.1') {
    times = 4000
}

const timesArray = []

for (let i = times - 1; i >= 0; i--) {
    timesArray.push('lol')
}

speedteststep.start((times * loopCacheProviders.length) * 2)

async.eachLimit(loopCacheProviders, 1, function iteratee(currentCacheProvider, callback1) {
    db.init(settings, () => {
        db.flushAll(err => {
            resultsCache[currentCacheProvider] = {
                startTime: moment(),
            }
            async.eachLimit(timesArray, 15, function iteratee(item2, callback2) {
                if (err) {
                    throw new Error(err)
                }

                db.query('SELECT ? + ? AS solution', [1, 6], result => {
                    speedteststep.tick()
                    callback2()
                })
            }, done => {
                resultsCache[currentCacheProvider].stopTime = moment()
                resultsCache[currentCacheProvider].diff = moment.duration(resultsCache[currentCacheProvider].stopTime.diff(resultsCache[currentCacheProvider].startTime)).asMilliseconds()
                callback1()
            })
        })
    })
}, done => {
    async.eachLimit(loopCacheProviders, 1, function iteratee(currentCacheProvider, callback1) {
        settings.caching = false
        db.init(settings, () => {
            db.flushAll(err => {
                resultsNoCache[currentCacheProvider] = {
                    startTime: moment(),
                }
                async.eachLimit(timesArray, 15, function iteratee(item2, callback2) {
                    if (err) {
                        throw new Error(err)
                    }

                    db.query('SELECT ? + ? AS solution', [1, 6], result => {
                        speedteststep.tick()
                        callback2()
                    })
                }, done => {
                    resultsNoCache[currentCacheProvider].stopTime = moment()
                    resultsNoCache[currentCacheProvider].diff = moment.duration(resultsNoCache[currentCacheProvider].stopTime.diff(resultsNoCache[currentCacheProvider].startTime)).asMilliseconds()
                    callback1()
                })
            })
        })
    }, done => {
        speedteststep.finish()
        for (let i = 0; i < loopCacheProviders.length; i++) {
            const resNoCache = resultsNoCache[loopCacheProviders[i]]
            const resCache = resultsCache[loopCacheProviders[i]]

            let time    = (parseInt(resNoCache.diff) - parseInt(resCache.diff))
            let timeref = (parseInt(resCache.diff) - parseInt(resNoCache.diff))

            let faster = colors.green(colors.bold(time + 'ms') + ' faster')

            if (time <= 0) {
                faster = colors.red(colors.bold(timeref + 'ms') + ' slower')
            }

            const extraInfo = colors.red(parseInt(resNoCache.diff)) + 'ms' + colors.bold(' VS ') + colors.green(parseInt(resCache.diff)) + 'ms'

            console.log(rightpad(colors.bold(loopCacheProviders[i]), 20) + ' is ' + rightpad(faster, 10) + ' (' + extraInfo + ')' + ' at getting ' + colors.underline(times) + ' records with mysql-cache enabled')
        }
        console.log()
        console.log(colors.red('red = no cache'))
        console.log(colors.green('green = cache'))
        process.exit()
    })
})

function rightpad (str, len, ch) {
    str = String(str)
    let i = -1

    if (!ch && ch !== 0) {
        ch = ' '
    }
    len = len - str.length
    while (++i < len) {
        str = str + ch
    }

    return str
}
