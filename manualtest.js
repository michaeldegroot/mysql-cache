const db = require('./app')

db.init({
    host:            '127.0.0.1',
    user:            'root',
    password:        'developer',
    database:        'mysqlcache',
    TTL:             0,
    connectionLimit: 2,
    verbose:         true,
    caching:         true,
    cacheProvider:   'LRU',
})


db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
    console.log('result', resultMysql[0].solution)
    db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
        console.log('result', resultMysql[0].solution)
        db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
            console.log('result', resultMysql[0].solution)
            db.delKey('SELECT ? + ? AS solution', [6, 6])
            db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
                console.log('result', resultMysql[0].solution)
                db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
                    console.log('result', resultMysql[0].solution)
                })
            })
        })
    })
})


setTimeout(() => {
    db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
        console.log('result', resultMysql[0].solution)
        db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
            console.log('result', resultMysql[0].solution)
            db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
                console.log('result', resultMysql[0].solution)
                db.flushAll()
                db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
                    console.log('result', resultMysql[0].solution)
                    db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
                        console.log('result', resultMysql[0].solution)
                    })
                })
            })
        })
    })
}, 2000)
