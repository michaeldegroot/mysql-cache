const db     = require('../app.js')
const assert = require('assert-plus')

describe('Test', () => {
	it('Call Init', () => {
		timeout(15000)
		assert.doesNotThrow(() => {
			db.init({
				host: '127.0.0.1',
				user: 'root',
				password: '',
				database: 'mysqlcache',
				TTL: 0,
				connectionLimit: 100,
				verbose: true,
				caching: true
			})
		}, Error)
	})

	it('Test connection', (done) => {
		db.testConnection(() => {
			done()
		})
	})

	it('Show stats', () => {
		db.stats()
	})

	it('Call a query', done => {
		db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql) => {
			assert.equal(resultMysql[0].solution, 6)
			done()
		})
	})

	it('Call a query without params', done => {
		db.query('SELECT 1 + 1 AS solution', (err, resultMysql) => {
			assert.equal(resultMysql[0].solution, 2)
			done()
		})
	})

	it('Call a query as sql object', done => {
		db.query({sql:'SELECT 6 + 6 AS solution'}, (err, resultMysql) => {
			assert.equal(resultMysql[0].solution, 12)
			done()
		})
	})

	it('Call a query without a callback', done => {
			db.query({sql:'SELECT 6 + 6 AS solution'})
			done()
	})

	it('Test cache', done => {
		db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql) => {
			assert.equal(resultMysql[0].solution, 6)
			done()
		})
	})

	it('Delete a key', () => {
		db.delKey('SELECT ? + ? AS solution', [1, 5])
	})

	it('One time setting per query', done => {
		db.query('SELECT ? + ? AS solution', [10, 5], (err, resultMysql) => {
			assert.equal(resultMysql[0].solution, 15)
			done()
		}, {cache:false, TTL:600})
	})

	it('Non select statement', done => {
		const post = {}
		db.query('insert into test SET ?', post, (err, resultMysql) => {
			done()
		})
	})

	it('Flush all cache', () => {
		assert.doesNotThrow(() => {
			db.flushAll()
		}, Error)
	})

	it('Change DB', done => {
		db.changeDB({
			user:'root',
			pass: '',
			database: 'mysqlcache',
			charset:'utf8'
		}, err => {
			assert.doesNotThrow(() => {
				if(err) {
					throw err
				}
				done()
			}, Error)
		})
	})

	it('Change TTL', () => {
		assert.doesNotThrow(() => {
			db.TTL = 60
		}, Error)
	})

	it('Trigger: A Connection was trying to be released while it already was!', done => {
		db.getPool(connection => {
			db.endPool(connection, () => {
				db.endPool(connection, poolResult => {
					db.query('SELECT ? + ? AS solution', [1, 5], (err, resultMysql) => {
						assert.equal(resultMysql[0].solution, 6)
					})
				}, Error)
				done()
			})
		})
	})

	it('Change DB to a wrong host', done => {
		db.changeDB({
			user:'root',
			pass:'',
			database: 'mysqlcache',
			charset:'utf8'
		}, err => {
			assert.throws(() => {
				if(err) {
					throw err
				}
				done()
			}, Error)
		})
	})

	it('Create a pool error', done => {
		db.getPool(connection => {
			db.endPool(connection, () => {
				db.endPool(connection, poolResult => {
					assert.equal(poolResult, false)
					done()
				})
			})
		})
	})



	it('Fake some error messages', () => {
		db.QPM = 2000
		db.poolConnections = 2000
		db.stats()
	})
})
