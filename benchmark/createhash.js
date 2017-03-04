'use strict'

const MysqlCache         = require('../app')
const Benchmark          = require('benchmark')
const settings           = require('../settings').settings()
const suite              = new(Benchmark.Suite)

const db = new MysqlCache(settings)

suite.add('sha512', {
    fn: () => {
        db.config.hashing = 'sha512'
        db.createHash(Math.floor(Math.random() * 99999999999) + 1)
    },
})

suite.add('sha256', {
    fn: () => {
        db.config.hashing = 'sha256'
        db.createHash(Math.floor(Math.random() * 99999999999) + 1)
    },
})

suite.add('md5', {
    fn: () => {
        db.config.hashing = 'md5'
        db.createHash(Math.floor(Math.random() * 99999999999) + 1)
    },
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
