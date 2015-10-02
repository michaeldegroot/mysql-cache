'use strict'

const async              = require('async')
const settings           = require('../settings').settings()
const MysqlCache         = require('../app')
const Benchmark          = require('benchmark')
const suite              = new(Benchmark.Suite)
let go                   = false
const db                 = new MysqlCache(settings)
const loopCacheProviders = db.cacheProviders

const benchmarkFunction = (provider, deferred) => {
    db.config.hashing = 'sha256'
    if (provider !== 'no-cache') {
        db.config.cacheProvider = provider
        db.config.caching       = true
    } else {
        db.config.cacheProvider = 'native'
        db.config.caching       = false
    }

    if (db.cacheProvider.provider !== provider && provider !== 'no-cache') {
        db.cacheProvider.setup(db.config)
    }

    if (provider === 'no-cache' && db.cacheProvider.provider !== 'native') {
        db.cacheProvider.setup(db.config)
    }

    if (!go) {
        process.nextTick(() => {
            deferred.resolve()
        })

        return
    }

    db.query({
        sql:    'SELECT ? + ? AS SOLUTION',
        params: [
            Math.floor(Math.random() * 100000000000) + 1  + Math.floor(Math.random() * 100000000000) + 1  ,
            Math.floor(Math.random() * 100000000000) + 1  + Math.floor(Math.random() * 100000000000) + 1  ,
        ],
    }, (err, mysql, cache) => {
        if (err) {
            throw new Error(err)
        }
        process.nextTick(() => {
            deferred.resolve()
        })
    })
}

suite.add('no-cache', {
    defer: true,
    fn:    deferred => {
        benchmarkFunction('no-cache', deferred)
    },
})

async.each(loopCacheProviders, function(item) {
    if (item === 'mmap') {
        try {
            console.log(require.resolve('mmap-object'))
        } catch (e) {
            console.log(' > MMAP is not found on this system and will be skipped for this test.')

            return
        }
    }

    suite.add(item, {
        defer: true,
        fn:    deferred => {
            benchmarkFunction(item, deferred)
        },
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
