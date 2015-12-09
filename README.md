[ ![npm](https://nodei.co/npm/mysql-cache.png?downloads=true&downloadRank=true&stars=true) ](https://www.npmjs.com/package/mysql-cache "npmjs")

[ ![](https://david-dm.org/michaeldegroot/mysql-cache.svg "deps") ](https://david-dm.org/michaeldegroot/mysql-cache "david-dm")
[ ![](https://travis-ci.org/michaeldegroot/mysql-cache.svg?branch=master "testing") ](https://travis-ci.org/michaeldegroot/mysql-cache "travis-ci")
[ ![](https://coveralls.io/repos/michaeldegroot/mysql-cache/badge.svg?branch=master&service=github)](https://coveralls.io/github/michaeldegroot/mysql-cache?branch=master)
![](https://img.shields.io/badge/Node-%3E%3D0.10-green.svg)
![](https://img.shields.io/npm/dt/mysql-cache.svg)
![](https://img.shields.io/npm/l/mysql-cache.svg)

___
## What it does
Automatically caches SELECT sql's in the machine's memory using node-cache. This module is wrapping the [mysql](https://www.npmjs.com/package/mysql) module
___
## Changelog

[https://github.com/michaeldegroot/mysql-cache/commits/master](https://github.com/michaeldegroot/mysql-cache/commits/master)
___
##  How do I use it?

##### 1. Start by installing the package:
    npm install mysql-cache

##### 2. Load the code
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
##### 3. Do awesome stuff!
```javascript
// Start executing SQL like you are used to using the mysql module
db.query("SELECT ? + ? AS solution", [1, 5], function(resultMysql) { // will be cached
    // Do something with the results
}).

// If later in your code this exact sql is run again,
// It will retrieve it from cache instead of database.

db.query("SELECT ? + ? AS solution", [1, 5], function(resultCached) { // from cache because same sql
    // Do something with the results
})
```

___
## Speedtest

I have added a speedtest.js in the root directory of this module. You can execute it by yourself via this command:
```javascript
node speedtest.js --host databasehostiphere --user databaseuserhere --pass databasepasswordhere --database databasenamehere
```

On my crappy wifi connection (and external database host) I had the following results:

![cachetest.png](https://bitbucket.org/repo/jjGr8o/images/418494615-cachetest.png)
___
## API

###  .query (sql,params,callback,data)
    sql:        The sql you want to execute
    *params:    This is used if you want to escape values
    callback:   Usefull if you want to have the result back of the query. If result = false the query failed
    data:       You can pass one time settings for this query, check the examples below!
\* [More about escaping values by using params](https://github.com/felixge/node-mysql/blob/master/Readme.md#escaping-query-values)

_Will execute the given SQL and cache the result if it's a SELECT statement.   
If the SQL was executed before, it will skip the database request and retrieve it from the cache straight away._

__Example__

```javascript
db.query("SELECT id,username,avatar FROM accounts WHERE id = ?", [530], function(result) {
    console.log(result);
});
```

__Example with one time setting per query__

```javascript
db.query("SELECT id, username, avatar FROM accounts WHERE id = ?", [530], function(result) {
    console.log(result);
}, {
    TTL: 600 // Will set TTL to 600 only for this query
});

db.query("SELECT id, username, avatar FROM accounts WHERE id = ?", [530], function(result) {
    console.log(result);
}, {
    cache: false // Will not cache this query
});
```

The db.query function is using node-mysql for querying (wrapper).  
Check the [mysql](https://www.npmjs.com/package/mysql) [documentation](https://github.com/felixge/node-mysql/blob/master/Readme.md) for more information about [escaping values](https://github.com/felixge/node-mysql/blob/master/Readme.md#escaping-query-values) and other handy features
___
### .delKey (id,params)
    id:     The sql in string format of the cache key you are trying to delete
    params: This is required if the cache key had any questionmarks (params) in the sql
_Deletes a cache key in the cache. You will need to supply a SQL format_

__Example__

```javascript
db.delKey("SELECT id,username,avatar FROM accounts WHERE id = ?", [530]);
```

This exact SQL and result is now removed from the cache. Making sure the next time this query is executed; it will be retrieved from the database.
___
###  .stats ()
_Will console.log() some statistics regarding mysql-cache_

__Example__

```javascript
db.stats();
```
___
###  .flushAll ()
_removes all keys and values from the cache_

__Example__

```javascript
db.flushAll();
```
___
###  .TTL 
_Changes the amount of Time To Live in seconds for all future made cache keys._

__Example__

```javascript
db.TTL = 5;
```
___
### .changeDB (Object)
    {
        user: ''        // The name of the new user
        password: ''    // The password of the new user
        database: ''    // The new database 
        charset: ''     // The new charset
    }
_MySQL offers a changeUser command that allows you to alter the current user and other aspects of the connection without shutting down the underlying socket_

```javascript
db.changeDB({user:"testusername", password:"keepo", database:"kappa", charset:"utf8"}, function(err){
    if(err) throw err;
    // Database settings are now changed, do something.
})
```

_This changes database connection settings on the fly._

 ___
## Contact
You can contact me at specamps@gmail.com