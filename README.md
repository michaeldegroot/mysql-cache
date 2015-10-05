#  - mysql-cache
## Changelog

 - 0.1.0 Release
 - 0.1.1 - 0.1.3 Readme updates
 - 0.1.4 db.Delkey function added
 - 0.1.5 Readme updated with all functions
 - 0.1.8 Ability to supply a object to all query's containing settings that are only applied to that query. Check API's for more information
 - 0.2.3 Change database connection settings on the fly with db.changeDB
 - 0.2.4 db.changeDB now has a callback parameter added


## What it does


Automatically caches SELECT sql's in the machine's memory using node-cache. Also using node-mysql connection pools and it's SQL format style


## How does it look?

![tank.gif](https://bitbucket.org/repo/jjGr8o/images/2064265396-tank.gif)

```javascript
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
                        db.stats(); // show some interesting statistics regarding mysql-cache
                        db.changeDB({user:"testusername",pass:"keepo",database:"kappa",charset:"utf8"}, function(err){  // Change database connection settings on the fly.
				if(err) throw err;
			});
		});
	},{cache:false}); // Do not cache this query.
},{TTL:600}); // Set TTL to 600 only for this query.

db.flushAll(); // Flush the cache.
```


##  How do I use it?

### 1. Start by installing the package:
    npm install mysql-cache

### 2. Put this in your nodejs server file:
```javascript
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
```



	
### 3. Now you can do stuff like:
```javascript
// Start executing SQL like you are used to using node-mysql
db.query("SELECT ? + ? AS solution",[1,5],function(resultMysql){ // the SQL contains a SELECT which means it will be cached for future use.
	db.query("SELECT ? + ? AS solution",[1,5],function(resultCached){ // This exact SQL has been executed before and will be retrieved from cache.
		db.delKey("SELECT ? + ? AS solution",[1,5]); // Delete this SQL cache key.
		db.query("SELECT ? + ? AS solution",[1,5],function(resultRemoved){ // This SQL will be executed on the database because the sql cache key was deleted.
			console.log("Result from mysql is: "+resultMysql[0].solution);
			console.log("Result cached is: "+resultCached[0].solution);
			console.log("Result after cache key is deleted: "+resultRemoved[0].solution);
                        db.stats(); // show some interesting statistics regarding mysql-cache
                        db.changeDB({user:"testusername",pass:"keepo",database:"kappa",charset:"utf8"}, function(err){  // Change database connection settings on the fly.
				if(err) throw err;
			});
		});
	},{cache:false}); // Do not cache this query.
},{TTL:600}); // Set TTL to 600 only for this query.

db.TTL = 60; // Change amount of Time To Live in seconds for a cache key in realtime.

db.flushAll(); // Flush the cache.
```

## Speedtest
I have added a speedtest.js in the root directory of this module. You can execute it by yourself via this command:
```javascript
node speedtest.js --host databasehostiphere --user databaseuserhere --pass databasepasswordhere --database databasenamehere
```

## API
###  - query (sql,params,callback,data)
Will execute the given SQL and cache the result if it is a SELECT statement.

If the SQL was executed and cached before it will skip the database request and retrieve it from the cache straight away.

__Example__

```javascript
db.query("SELECT id,username,avatar FROM accounts WHERE id = ?", [530], function(result) {
    console.log(result);
});
```

__Example with one time setting per query__

```javascript
db.query("SELECT id,username,avatar FROM accounts WHERE id = ?", [530], function(result) {
    console.log(result);
},{TTL:600}); // Will set TTL to 600 only for this query


db.query("SELECT id,username,avatar FROM accounts WHERE id = ?", [530], function(result) {
    console.log(result);
},{cache:false}); // Will not cache this query
```

The db.query function is using node-mysql for querying. Check node-mysql documentation for more information about escaping values and other handy features: [node-mysql](https://github.com/felixge/node-mysql/blob/master/Readme.md)

### - delKey (id,params)
Deletes a cache key in the cache. You will need to supply a SQL format

__Example__

```javascript
db.delKey("SELECT id,username,avatar FROM accounts WHERE id = ?", [530]);
```

This exact SQL and result is now removed from the cache. Making sure the next time this query is executed; it will be retrieved from the database.

###  - stats ()
Will console.log() some statistics regarding mysql-cache

__Example__

```javascript
db.stats();
```

###  - flushAll ()
removes all keys and values from the cache

__Example__

```javascript
db.flushAll();
```

###  - TTL 
Changes the amount of Time To Live in seconds for all future made cache keys.

__Example__

```javascript
db.TTL = 5;
```

### - changeDB (data)
MySQL offers a changeUser command that allows you to alter the current user and other aspects of the connection without shutting down the underlying socket

```javascript
db.changeDB({user:"testusername",pass:"keepo",database:"kappa",charset:"utf8"}, function(err){
    if(err) throw err;
    // Database settings are now changed, do something.
})
```

This changes database connection settings on the fly.

Available variables to change are:

* user: The name of the new user
* password: The password of the new user
* charset: The new charset
* database: The new database 

 
## Contact
You can contact me at specamps@gmail.com