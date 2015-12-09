[ ![npm](https://nodei.co/npm/mysql-cache.png?downloads=true&downloadRank=true&stars=true)

[ ![](https://david-dm.org/michaeldegroot/mysql-cache.svg "deps") ](https://david-dm.org/michaeldegroot/mysql-cache "david-dm")
[ ![](https://travis-ci.org/michaeldegroot/mysql-cache.svg?branch=master "testing") ](https://travis-ci.org/michaeldegroot/mysql-cache "travis-ci")
[ ![](https://coveralls.io/repos/michaeldegroot/mysql-cache/badge.svg?branch=master&service=github)](https://coveralls.io/github/michaeldegroot/mysql-cache?branch=master)
![](https://img.shields.io/badge/Node-%3E%3D0.10-green.svg)
![](https://img.shields.io/npm/dt/mysql-cache.svg)
![](https://img.shields.io/npm/l/mysql-cache.svg)

**Table of Contents**

- [Changelog](#changelog)
- [What it does](#what-it-does)
- [How does it look?](#how-does-it-look)
- [How do I use it?](#how-do-i-use-it)
- [Speedtest](#speedtest)
- [API](#api)
- [Contact](#contact)

## Changelog

https://github.com/michaeldegroot/mysql-cache/commits/master


## What does it do
Automatically caches SELECT sql's in the machine's memory using node-cache. This module is wrapping the [mysql](https://www.npmjs.com/package/mysql) module

##  How do I use it?

### 1. Start by installing the package:
    npm install mysql-cache

### 2. Load the code
```javascript
var db = require('mysql-cache');

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
### 3. Now do awesome stuff:
```javascript
// Start executing SQL like you are used to using the mysql module
db.query("SELECT ? + ? AS solution",[1,5],function(resultMysql){ // will be cached
    // Do something with the results
}).

// If later in your code this exact sql is run again,
// It will retrieve it from cache instead of database.

db.query("SELECT ? + ? AS solution",[1,5],function(resultCached){ // from cache because same sql
    // Do something with the results
})
```


## Speedtest

I have added a speedtest.js in the root directory of this module. You can execute it by yourself via this command:
```javascript
node speedtest.js --host databasehostiphere --user databaseuserhere --pass databasepasswordhere --database databasenamehere
```

On my crappy wifi connection (and external database host) I had the following results:

![cachetest.png](https://bitbucket.org/repo/jjGr8o/images/418494615-cachetest.png)

## API

###  .query (sql,params,callback,data)
_Will execute the given SQL and cache the result if it is a SELECT statement. If the SQL was executed and cached before it will skip the database request and retrieve it from the cache straight away._

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

The db.query function is using node-mysql for querying. Check mysql documentation for more information about escaping values and other handy features: [mysql](https://github.com/felixge/node-mysql/blob/master/Readme.md)

### .delKey (id,params)
_Deletes a cache key in the cache. You will need to supply a SQL format_

__Example__

```javascript
db.delKey("SELECT id,username,avatar FROM accounts WHERE id = ?", [530]);
```

This exact SQL and result is now removed from the cache. Making sure the next time this query is executed; it will be retrieved from the database.

###  .stats ()
_Will console.log() some statistics regarding mysql-cache_

__Example__

```javascript
db.stats();
```

###  .flushAll ()
_removes all keys and values from the cache_

__Example__

```javascript
db.flushAll();
```

###  .TTL 
_Changes the amount of Time To Live in seconds for all future made cache keys._

__Example__

```javascript
db.TTL = 5;
```

### .changeDB (data)
_MySQL offers a changeUser command that allows you to alter the current user and other aspects of the connection without shutting down the underlying socket_

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