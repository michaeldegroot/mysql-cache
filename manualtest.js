const db = require('./app')

db.init({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'mysqlcache',
    TTL: 0,
    connectionLimit: 2,
    verbose: true,
    caching: true,
    cacheProvider: 'LRU'
})


db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
    console.log('result', resultMysql[0].solution)
    db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
        console.log('result', resultMysql[0].solution)
        db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
            console.log('result', resultMysql[0].solution)
        })
    })
})
