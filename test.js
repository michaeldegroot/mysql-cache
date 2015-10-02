// Require the module.
var db = require('./app.js');

// Setup some information.
db.init({
	host: '',
	user: '',
	password: '',
	database: '',
	connectionLimit: 100, // Mysql connection pool limit (increase value if you are having problems)
	verbose: true, // Do you want console.log's about what the program is doing?
	caching: true // Do you want to use SELECT SQL caching?
});

// Start executing SQL like you are used to using node-mysql
db.query("SELECT ? + ? AS solution",[1,5],function(resultMysql){ // the SQL contains a SELECT which means it will be cached for future use.
	db.query("SELECT ? + ? AS solution",[1,5],function(resultCached){ // This exact SQL has been executed before and will be retrieved from cache.
		console.log("Result from mysql is: "+resultMysql[0].solution);
		console.log("Result cached is: "+resultCached[0].solution);
		db.stats(); // Show some interesting statistics about cache-mysql.
	});
});

db.flushAll(); // Flush the cache.

db.TTL = 5; // Amount of Time To Live for a cache key.
