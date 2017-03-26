'use strict'

const async              = require('async')
const settings           = require('../settings').settings()
const MysqlCache         = require('../app')
const Benchmark          = require('benchmark')
const suite              = new(Benchmark.Suite)
const db                 = new MysqlCache(settings)
const loopCacheProviders = db.cacheProviders

const benchmarkFunction = (provider, deferred, myDb) => {
    myDb.query({
        sql:    'SELECT ? + ? AS SOLUTION',
        params: [
            5,
            5,
        ],
    }, (err, mysql, cache) => {
        if (err) {
            throw new Error(err)
        }
        deferred.resolve()
    })
}

let addedIndex = 1

async.each(loopCacheProviders, function(item) {
    if (item === 'mmap') {
        try {
            console.log(require.resolve('mmap-object'))
        } catch (e) {
            console.log(' > MMAP is not found on this system and will be skipped for this test.')

            return
        }
    }

    settings.cacheProvider = item
    const newDb = new MysqlCache(settings)

    newDb.connect(err => {
        if (err) {
            throw err
        }

        suite.add(item, {
            defer: true,
            fn:    deferred => {
                benchmarkFunction(item, deferred, newDb)
            },
        })

        addedIndex++

        if (addedIndex >= loopCacheProviders.length) {
            suite.run({
                'async': false,
            })
        }
    })
})

suite.on('cycle', function(event) {
    console.log(String(event.target))
})

suite.on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
    process.exit()
})

suite.run({
    'async': true,
})
