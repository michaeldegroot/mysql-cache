# What it does

###### Automatically caches SELECT SQLs in the machine's memory using node-cache and node-mysql.  ######


# How does it look?

![tank.gif](https://bitbucket.org/repo/jjGr8o/images/2064265396-tank.gif)

```
#!nodejs
// Require the module.
var db = require('cache-mysql');

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
```



#  How do I use it?

## 1. Start by installing the package:
    npm install cache-mysql

## 2. Put this in your nodejs server file:

    // Require the module.
    var db = require('cache-mysql');

    // Setup your database information
    db.init({
	host: '',
	user: '',
	password: '',
	database: '',
	connectionLimit: 100, // Mysql connection pool limit (increase value if you are having problems)
	verbose: true, // Do you want console.log's about what the program is doing?
	caching: true // Do you want to use SELECT SQL caching?
    });




	
## 3. Now you can do stuff like:
    // Start executing SQL like you are used to using node-mysql
    db.query("SELECT ? + ? AS solution",[1,5],function(resultMysql){ // the SQL contains a SELECT which means it will be cached for future use.
        db.query("SELECT ? + ? AS solution",[1,5],function(resultCached){ // This exact SQL has been executed before and will be retrieved from cache.
            console.log("Result from mysql is: "+resultMysql[0].solution);
            console.log("Result cached is: "+resultCached[0].solution);
            db.stats(); // Show some interesting statistics about cache-mysql.
        });
    });

# Contact
    You can contact me at specamps@gmail.com