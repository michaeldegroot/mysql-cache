// Require the module.
var db = require('./app.js');

// Setup some information.
db.init({
	host: '',
	user: '',
	password: '',
	database: '',
	TTL: 0, // Time To Live for a cache key in seconds (0 = infinite)
	connectionLimit: 100, // Mysql connection pool limit (increase value if you are having problems)
	verbose: true, // Do you want info and success messages about what the program is doing?
	caching: true // Do you want to enable caching?
});

db.TTL = 60; // Change amount of Time To Live in seconds for a cache key in realtime.

// Start executing SQL like you are used to using node-mysql
db.query("SELECT ? + ? AS solution",[1,5],function(resultMysql){ // the SQL contains a SELECT which means it will be cached for future use.
	db.query("SELECT ? + ? AS solution",[1,5],function(resultCached){ // This exact SQL has been executed before and will be retrieved from cache.
		db.delKey("SELECT ? + ? AS solution",[1,5]); // Delete this SQL cache key.
		db.query("SELECT ? + ? AS solution",[1,5],function(resultRemoved){ // This SQL will be executed on the database because the sql cache key was deleted.
			console.log("Result from mysql is: "+resultMysql[0].solution);
			console.log("Result cached is: "+resultCached[0].solution);
			console.log("Result after cache key is deleted: "+resultRemoved[0].solution);
			db.stats(); // Show some interesting statistics about cache-mysql.
		});
	});
});



db.flushAll(); // Flush the cache.

