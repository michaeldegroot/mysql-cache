'use strict'

const appRoot            = require('app-root-path')
const moment             = require('moment')
const async              = require('async')
const colors             = require('colors')
const speedteststep      = require(appRoot + '/speedteststep')
const settings           = require(appRoot + '/settings').settings()
const util               = require(appRoot + '/util')
const db                 = require(appRoot + '/app')
const speedtestbase      = require(appRoot + '/speedtestbase')
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
let times          = 60

if (settings.host.toLowerCase() === 'localhost' || settings.host === '127.0.0.1') {
    times = 1000
}

speedteststep.start((times * loopCacheProviders.length) * 2)

async.eachSeries(loopCacheProviders, function iteratee(item1, callback1) {
    resultsCache[item1] = {
        startTime: moment(),
    }
    speedtestbase.run(item1, times, true, () => {
        resultsCache[item1].stopTime = moment()
        resultsCache[item1].diff = moment.duration(resultsCache[item1].stopTime.diff(resultsCache[item1].startTime)).asMilliseconds()
        callback1()
    })
}, done => {
    async.eachSeries(loopCacheProviders, function iteratee(item2, callback2) {
        resultsNoCache[item2] = {
            startTime: moment(),
        }
        speedtestbase.run(item2, times, false, () => {
            resultsNoCache[item2].stopTime = moment()
            resultsNoCache[item2].diff = moment.duration(resultsNoCache[item2].stopTime.diff(resultsNoCache[item2].startTime)).asMilliseconds()
            callback2()
        })
    }, done => {
        speedteststep.finish()
        for (let i = 0; i < loopCacheProviders.length; i++) {
            let time    = (parseInt(resultsNoCache[loopCacheProviders[i]].diff) - parseInt(resultsCache[loopCacheProviders[i]].diff))
            let timeref = (parseInt(resultsCache[loopCacheProviders[i]].diff) - parseInt(resultsNoCache[loopCacheProviders[i]].diff))

            let faster = colors.green(colors.bold(time + 'ms') + ' faster')

            if (time <= 0) {
                faster = colors.red(colors.bold(timeref + 'ms') + ' slower')
            }

            const extraInfo = colors.red(parseInt(resultsNoCache[loopCacheProviders[i]].diff)) + 'ms' + colors.bold(' VS ') + colors.green(parseInt(resultsCache[loopCacheProviders[i]].diff)) + 'ms'

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
