const db       = require('../app')
const assert   = require('assert-plus')
const settings = require('./settings').settings()

describe('Fakerino', function() {
    this.timeout(15000)
    it('Fake db connect', done => {
        db.init({
            host: 'kappa',
            user: settings.user,
            password: settings.password,
            database: 'mysqlcache',
            TTL: 0,
            connectionLimit: 100,
            verbose: true,
            caching: true
        })
        db.testConnection(res => {
            console.log(res)
        })
        setTimeout(() => {
            done()
        }, 3000)
    })
})
