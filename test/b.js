var db = require('../app.js');
var assert = require('assert');
var assert = require('assert-plus');



it('Call init, disable cache, call query', function(done){
	db.init({
		host: '127.0.0.1',
		user: 'root',
		password: '',
		database: 'mysqlcache',
		TTL: 0, // Time To Live for a cache key in seconds (0 = infinite)
		connectionLimit: 100, // Mysql connection pool limit (increase value if you are having problems)
		verbose: true, // Do you want info and success messages about what the program is doing?
		caching: false // Do you want to enable caching?
	});
	db.query({sql:"SELECT 6 + 6 AS solution"},function(resultMysql){
		assert.equal(resultMysql[0].solution,12);
		done();
	});
});

it('Call init without supplying host value', function(){
	assert.throws(function(){
		db.init({
			user: 'root',
			password: '',
			database: 'mysqlcache',
			TTL: 0, // Time To Live for a cache key in seconds (0 = infinite)
			connectionLimit: 100, // Mysql connection pool limit (increase value if you are having problems)
			verbose: true, // Do you want info and success messages about what the program is doing?
			caching: true // Do you want to enable caching?
		});
	}, Error);
});
it('Call init without supplying user value', function(){
	assert.throws(function(){
		db.init({
			host: '127.0.0.1',
			password: '',
			database: 'mysqlcache',
			TTL: 0, // Time To Live for a cache key in seconds (0 = infinite)
			connectionLimit: 100, // Mysql connection pool limit (increase value if you are having problems)
			verbose: true, // Do you want info and success messages about what the program is doing?
			caching: true // Do you want to enable caching?
		});
	}, Error);
});

it('Call init without supplying connectionLimit value', function(){
	assert.throws(function(){
		db.init({
			host: '127.0.0.1',
			user: 'root',
			password: '',
			database: 'mysqlcache',
			TTL: 0, // Time To Live for a cache key in seconds (0 = infinite)
			verbose: true, // Do you want info and success messages about what the program is doing?
			caching: true // Do you want to enable caching?
		});
	}, Error);
});

it('Call init without supplying database value', function(){
	assert.throws(function(){
		db.init({
			host: '127.0.0.1',
			password: '',
			user: 'root',
			TTL: 0, // Time To Live for a cache key in seconds (0 = infinite)
			connectionLimit: 100, // Mysql connection pool limit (increase value if you are having problems)
			verbose: true, // Do you want info and success messages about what the program is doing?
			caching: true // Do you want to enable caching?
		});
	}, Error);
});