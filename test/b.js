const db     = require('../app')
const assert = require('assert-plus')
const settings = require('./settings').settings()

describe('Test2', function() {
    this.timeout(15000)
    it('Call init, disable cache, call query', done => {
        db.init({
            host: '127.0.0.1',
            user: settings.user,
            password: settings.password,
            database: 'mysqlcache',
            TTL: 0, // Time To Live for a cache key in seconds (0 = infinite)
            connectionLimit: 100, // Mysql connection pool limit (increase value if you are having problems)
            verbose: true, // Do you want info and success messages about what the program is doing?
            caching: false, // Do you want to enable caching?
            cacheProvider: 'node-cache',
        })
        db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
            assert.equal(resultMysql[0].solution, 12)
            done()
        })
    })
})
