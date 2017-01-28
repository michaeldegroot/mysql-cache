[![](https://nodei.co/npm/mysql-cache.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/mysql-cache)

[![](https://david-dm.org/michaeldegroot/mysql-cache.svg)](https://david-dm.org/michaeldegroot/mysql-cache 'david-dm')
[![](https://travis-ci.org/michaeldegroot/mysql-cache.svg?branch=master)](https://travis-ci.org/michaeldegroot/mysql-cache)
[![](https://coveralls.io/repos/michaeldegroot/mysql-cache/badge.svg?branch=master&service=github)](https://coveralls.io/github/michaeldegroot/mysql-cache?branch=master)
![](https://img.shields.io/badge/Node-%3E%3D4.0-green.svg)
![](https://img.shields.io/npm/dt/mysql-cache.svg)
![](https://img.shields.io/npm/l/mysql-cache.svg)

___
# What it does
Automatically caches SELECT sql's in memory, you have serveral cache providers at your disposal and it can even work in clustered mode via redis or mmap!!

If you want to use the mmap cacheprovider install the dependency: `
    yarn add mmap-object@1.1.1` this is because windows users have reported problems with it.

This module is wrapping some functions of the [mysql](https://www.npmjs.com/package/mysql) module for ease of use
___
# Changelog

[https://github.com/michaeldegroot/mysql-cache/commits/master](https://github.com/michaeldegroot/mysql-cache/commits/master)
___
#  New in version 1.1.0:
Improved error handling and event emitters!

#### Events:
 - Connected: when you want to know when a connection has been established with mysql
 - Error: when a error occurred within mysql-cache 
 - Miss: when a cache object was not found
 - Flush: when the cache was flushed
 - Delete: when a cache was delete
 - Hit: when a cache object was found
 - Query: when a query is going to be run, before the cache check and cache object key generation

#### Error Handling:
 - Event emitter 'error' added
 - Errors are not being thrown anymore in the mysql-cache package
 - The init function returns a error on callback with a connected boolean

**Check out more information  about events in this page below!**
 
___
#  New in version 1.0.0 :rocket:
cacheProviders!

You are no longer binded to node-cache, you can now choose the following cache providers:
 - [LRU](https://www.npmjs.com/package/lru-cache)
 - [mmap](https://www.npmjs.com/package/mmap-object)
 - [redis](https://www.npmjs.com/package/redis)
 - [node-cache](https://www.npmjs.com/package/node-cache)
 - [file](https://www.npmjs.com/package/cacheman-file)
 - native (local variable assignment)

 **Important** If you want to use mmap you have to install the dependency: `
    yarn add mmap-object@1.1.1`

#  Getting Started

##### 1. Start by installing the package:
    yarn add mysql-cache

##### 2. Load the code
```javascript
const db = require('mysql-cache')

db.init({
    host:            '',
    user:            '',
    password:        '',
    database:        '',
    TTL:             0,             // Time To Live for a cache key in seconds (0 = infinite)
    connectionLimit: 100,           // Mysql connection pool limit (increase value if you are having problems)
    verbose:         true,          // Do you want console.log's about what the program is doing?
    caching:         true           // Do you want to use SELECT SQL caching?
    cacheProvider:   'LRU'          // You can choose different cache providers of your liking SEE BELOW:

    // Here are the cache providers you can choose:
    // LRU          (https://www.npmjs.com/package/lru-cache)
    // mmap         (https://www.npmjs.com/package/mmap-object works in clustered mode but is using IO!)
    // redis        (https://www.npmjs.com/package/redis using default 127.0.0.1 database 1)
    // node-cache   (https://www.npmjs.com/package/node-cache)
    // file         (https://www.npmjs.com/package/cacheman-file)
    // native       (local variable assignment)
}, (connected, err) => { // This is a callback for the init function
    if (err) {
        // Catch any connection establishment errors
        throw new Error(err)
    }

    if (connected) {
        console.log("W00t! i'm connected!!")
    }
})
```

 **Important** If you want to use mmap you have to install the dependency: `
    yarn add mmap-object@1.1.1`

##### 3. Do awesome stuff!
```javascript
// Start executing SQL like you are used to using the mysql module


db.query('SELECT ? + ? AS solution', [1, 5], (err, result) => {
    if (err) {
        throw new Error(err)
    }
    // This sql was not in the cache and was cached for future references

    // Do something with the output of the sql

    // Later in your code if this exact sql is run again (or in a different thread depending on cacheProvider chosen),
    // It will retrieve it from cache instead of the database.

    db.query('SELECT ? + ? AS solution', [1, 5], (err, result) => {
        // This query was retrieved from the cache, which was much faster!
        // Do something with the results
    })
})
```
___
# Clustered mode or Persistent mode
Want cached data to persist on restarts in your application? OR Running a application in clustered mode but want to share the cache? check this list below for compatibility for the cacheProviders:

- [ ] LRU
- [x] mmap
- [x] redis
- [ ] node-cache
- [x] file
- [ ] native

## Troubleshooting

##### Glibc errors on yarn/npm install (ubuntu)
```
wget http://launchpadlibrarian.net/130794928/libc6_2.17-0ubuntu4_amd64.deb
sudo dpkg -i libc6_2.17-0ubuntu4_amd64.deb
```
___
## Speedtest
*Edit the file* **settings.js** *make sure it reflects your mysql database settings*
*Then execute in the mysql-cache root directory:*
```javascript
node speedtest
```

Example output:

![cachetest.png](http://i.imgur.com/mBj0Jwg.png)
___

## Events

A new feature in 1.1.0 are event emitters, it is recommended to at least listen to the **error** event for any issues that might occur

```js
const db = require('mysql-cache')

// When you want to know when you are connected
db.event.on('connected', () => {
    console.log('We are now connected to the mysql database')
})

// Listen for any errors that might popup
db.event.on('error', err => {
    console.log('Oh noes a error has occured within mysql-cache or with a query: ', err)

    // Probably best to throw the error :)
    throw new Error(err)
})

// When all the cache gets flushed, by db.flush() for example
db.event.on('flush', () => {
    console.log('mysql-cache cache was flushed!')
})

// When all the cache gets flushed, by db.flush() for example
db.event.on('delete', hash => {
    console.log('this cache object was deleted from cache: ', hash)
})

// When a cache object was found when a query was run
db.event.on('hit', (query, hash, result) => {
    // query  = the sql code that was used
    // hash   = the hash that was generated for the cache key
    // result = the result that was found in the cache
    console.log('mysql-cache hit a cache object!', query, hash, result)
})

// When a cache object was NOT found when a query was run
db.event.on('miss', (query, hash, result) => {
    // query  = the sql code that was used
    // hash   = the hash that was generated for the cache key
    // result = the result that will be cached
    console.log('mysql-cache got a miss on a cache object!', query, hash, result)
})

// When a query was run
db.event.on('query', sql => {
    console.log('mysql-cache is going to run a query, it might be cached or not we dont know yet: ' + sql)
})
```

## API

###  .query (sql,params,callback,data)
```js
sql:        String    // The sql you want to execute
*params:    Object    // This is used if you want to escape values
callback:   Function  // For getting the (err, result) back of the query.
data:       Object    // One time settings for this query, check below for more
```

\* [More about escaping values by using params](https://github.com/felixge/node-mysql/blob/master/Readme.md#escaping-query-values)

*Will execute the given SQL and cache the (err, result) if it's a SELECT statement.*
*If the SQL was executed before, it will skip the database request and retrieve it from the cache straight away.*
*Invalid queries will throw a error*

__Example #1__

```javascript
db.query('SELECT id,username,avatar FROM accounts WHERE id = ?', [530], (err, result) => {
    console.log(result)
})
```


__Example #2__

```javascript
db.query({
    sql:'SELECT 6 + ? AS solution',
    params: [4],
}, (err, result) => {
    console.log(result)
})
```

__Example with one time setting per query__

```javascript
db.query('SELECT id, username, avatar FROM accounts WHERE id = ?', [530], (err, result) => {
    console.log(result)
}, {
    TTL: 600 // Will set TTL to 600 only for this query
})

db.query('SELECT id, username, avatar FROM accounts WHERE id = ?', [530], (err, result) => {
    console.log(result)
}, {
    cache: false // Will not cache this query
})
```

__Example with error handling__

```javascript
db.query('SELECT id, username, avatar FROM accounts WHERE id = ?', [530], (err, result) => {
    if (err) {
        throw new Error(err)
    }
    console.log(result)
})
```

The db.query function is using node-mysql for querying.
It's wrapping the sql function, check the [mysql](https://www.npmjs.com/package/mysql) [documentation](https://github.com/felixge/node-mysql/blob/master/Readme.md)   for more information about [escaping values](https://github.com/felixge/node-mysql/blob/master/Readme.md#escaping-query-values)

*mysql-cache only supports the use of questionmarks in sql at the moment for escaping values*

___
### .delKey (id,params)
```js
    id:         String    // The sql in string format of the cache key you are trying to delete
    params:     Object    // This is required if the cache key had any questionmarks (params) in the sql
```
_Deletes a cache key in the cache. You will need to supply a SQL format_

__Example #1__

```javascript
db.delKey('SELECT id,username,avatar FROM accounts WHERE id = ?', [530])
```

__Example #2__

```javascript
db.delKey('SELECT id,username,avatar FROM accounts WHERE id = ?', [530])
```

This exact SQL is now removed from the cache. Making sure the next time this query is executed it will be retrieved from the database.
___
###  .stats ()
_Will console.log() some statistics regarding mysql-cache_

__Example__

```javascript
db.stats()
```
___
###  .flush ()
_removes all keys and values from the cache_

__Example__

```javascript
db.flush()
```
___
###  .TTL
_Changes the amount of Time To Live in seconds for all future made cache keys._

__Example__

```javascript
db.TTL = 5
```
___
###  .caching
_Changes caching mode on/off._

__Example__

```javascript
db.caching = false

// All queries run now will not be utilizing the cache system

db.caching = true
// All queries run now will be utilizing the cache system
```
___
### .changeDB (Object)
```js
{
    user:       String  // The name of the new user
    password:   String  // The password of the new user
    database:   String  // The new database
    charset:    String  // The new charset
}
```
_MySQL offers a changeUser command that allows you to alter the current user and other aspects of the connection without shutting down the underlying socket_

```javascript
db.changeDB({user:'testusername', password:'keepo', database:'kappa', charset:'utf8'}, function(err){
    if(err) throw err
    // Database settings are now changed, do something.
})
```

_This changes database connection settings on the fly._

 ___
## Contact
You can contact me at specamps@gmail.com
