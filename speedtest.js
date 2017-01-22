'use strict'

const moment             = require('moment')
const async              = require('async')
const speedtestbase      = require('./speedtestbase')
const loopCacheProviders = [
    'redis',
    'node-cache',
]

const resultsCache   = {}
const resultsNoCache = {}
const times          = 1000

async.eachSeries(loopCacheProviders, function iteratee(item, callback) {
    resultsCache[item] = {
        startTime: moment(),
    }
    speedtestbase.run(item, times, true, () => {
        resultsCache[item].stopTime = moment()
        resultsCache[item].diff = moment.duration(resultsCache[item].stopTime.diff(resultsCache[item].startTime)).asMilliseconds()
        callback()
    })
}, done => {
    async.eachSeries(loopCacheProviders, function iteratee(item, callback) {
        resultsNoCache[item] = {
            startTime: moment(),
        }
        speedtestbase.run(item, times, false, () => {
            resultsNoCache[item].stopTime = moment()
            resultsNoCache[item].diff = moment.duration(resultsNoCache[item].stopTime.diff(resultsNoCache[item].startTime)).asMilliseconds()
            callback()
        })
    }, done => {
        for (let i = 0; i < loopCacheProviders.length; i++) {
            console.log(loopCacheProviders[i] + ' is ' + (parseInt(resultsNoCache[loopCacheProviders[i]].diff) - parseInt(resultsCache[loopCacheProviders[i]].diff))  + 'ms faster at getting ' + times + ' records with mysql-cache enabled')
        }
        process.exit()
    })
})
