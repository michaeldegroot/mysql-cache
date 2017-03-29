'use strict'

const MysqlCache = require('./app.js')
const settings   = require('./settings').settings()

settings.cacheProvider = 'fastfilecache'
settings.hashing = 'farmhash64'
settings.verbose = true

const mysql = new MysqlCache(settings)

mysql.connect(err => {
    mysql.query({
        sql: 'SELECT ? + ? AS solution',
        params: [1, 5],
        zone: 'klappazone',
    }, (err, res, cache) => {
        if (err) {
            throw err
        }

        mysql.query({
            sql: 'SELECT ? + ? AS solution',
            params: [15, 15],
            zone: 'klappazone',
        }, (err, res, cache) => {
            if (err) {
                throw err
            }

            mysql.query({
                sql: 'SELECT ? + ? AS solution',
                params: [1555, 1555],
                zone: 'klappazone',
            }, (err, res, cache) => {
                if (err) {
                    throw err
                }

                mysql.query({
                    sql: 'SELECT ? + ? AS solution',
                    params: [15554, 1552],
                    zone: 'klappazone420',
                }, (err, res, cache) => {
                    if (err) {
                        throw err
                    }
                })
            })
        })
    })

    setTimeout(() => {
        mysql.clearZone('klappazone', (err, res) => {
            console.log(err, res)
        })
    }, 3000)
})
