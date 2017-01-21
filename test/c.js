var db     = require('../app.js')
var assert = require('assert-plus')

describe('Fakerino', function() {
	this.timeout(15000)
	it('Fake db connect', done => {
		db.init({
			host: 'kappa',
			user: 'root',
			password: '',
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
		}, 6000)
	})
})
