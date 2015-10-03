# What it does

###### Automatically caches SELECT SQLs in the machine's memory using node-cache and node-mysql.  ######


# How does it look?

![tank.gif](https://bitbucket.org/repo/jjGr8o/images/2064265396-tank.gif)



    // Require the module.
    var db = require('mysql-cache');

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

    // Start executing SQL like you are used to using node-mysql
    db.query("SELECT ? + ? AS solution",[1,5],function(resultMysql){ // the SQL contains a SELECT which means it will be cached for future use.
	    db.query("SELECT ? + ? AS solution",[1,5],function(resultCached){ // This exact SQL has been executed before and will be retrieved from cache.
            console.log("Result from mysql is: "+resultMysql[0].solution);
            console.log("Result cached is: "+resultCached[0].solution);
            db.stats(); // Show some interesting statistics about mysql-cache.
        });
    });

    db.flushAll(); // Flush the cache.

    db.TTL = 60; // Change amount of Time To Live in seconds for a cache key in realtime.



#  How do I use it?

## 1. Start by installing the package:
    npm install mysql-cache

## 2. Put this in your nodejs server file:

    // Require the module.
    var db = require('mysql-cache');

    // Setup your database information
    db.init({
	host: '',
	user: '',
	password: '',
	database: '',
        TTL: 0, // Time To Live for a cache key in seconds (0 = infinite)
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
            db.stats(); // Show some interesting statistics about mysql-cache.
        });
    });

    db.flushAll(); // Flush the cache.

    db.TTL = 60; // Change amount of Time To Live in seconds for a cache key in realtime.

# Contact
    You can contact me at specamps@gmail.com