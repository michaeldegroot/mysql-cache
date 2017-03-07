'use strict'

const async              = require('async')
const settings           = require('../settings').settings()
const MysqlCache         = require('../app')
const Benchmark          = require('benchmark')
const suite              = new(Benchmark.Suite)
const db                 = new MysqlCache(settings)
const loopCacheProviders = db.cacheProviders

const mysql2 = require('mysql2')
const connection = mysql2.createConnection(settings)

connection.connect()

const benchmarkFunction = (provider, deferred, myDb) => {
    if (provider === 'mysql2') {
        return connection.query('SELECT ? + ? AS SOLUTION', [
                Math.floor(Math.random() * 100000000000) + 1  + Math.floor(Math.random() * 100000000000) + 1  ,
                Math.floor(Math.random() * 100000000000) + 1  + Math.floor(Math.random() * 100000000000) + 1  ,
            ]
        , (err, mysql, cache) => {
            if (err) {
                throw new Error(err)
            }
            deferred.resolve()
        })
    }

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

suite.add('mysql2', {
    defer: true,
    fn:    deferred => {
        benchmarkFunction('mysql2', deferred)
    },
})

let addedIndex = 0

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
