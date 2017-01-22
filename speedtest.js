'use strict'

const appRoot            = require('app-root-path')
const moment             = require('moment')
const async              = require('async')
const colors             = require('colors')
const speedteststep      = require(appRoot + '/speedteststep')
const util               = require(appRoot + '/util')
const speedtestbase      = require(appRoot + '/speedtestbase')
const loopCacheProviders = [
    'redis',
    'node-cache',
    'file',
    'lru',
]

util.verboseMode = true

if (/^win/.test(process.platform) === false) {
    try {
        require.resolve('mmap-object')
        loopCacheProviders.push('mmap')
    } catch (e) {
        util.trace('mmap-object is not installed on this system and will be skipped in this test.')
    }
}

const resultsCache   = {}
const resultsNoCache = {}
const times          = 1000

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
            console.log(colors.bold(loopCacheProviders[i]) + ' is ' + faster + ' at getting ' + colors.underline(times) + ' records with mysql-cache enabled')
        }
        process.exit()
    })
})
