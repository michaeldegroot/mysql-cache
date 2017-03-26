[![](https://nodei.co/npm/mysql-cache.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/mysql-cache)

[![](https://david-dm.org/michaeldegroot/mysql-cache.svg)](https://david-dm.org/michaeldegroot/mysql-cache 'david-dm')
[![](https://travis-ci.org/michaeldegroot/mysql-cache.svg?branch=npm)](https://travis-ci.org/michaeldegroot/mysql-cache)
[![](https://coveralls.io/repos/michaeldegroot/mysql-cache/badge.svg?branch=npm&service=github)](https://coveralls.io/github/michaeldegroot/mysql-cache?branch=npm)
![](https://img.shields.io/badge/Node-%3E%3D4.0-green.svg)
![](https://img.shields.io/npm/dt/mysql-cache.svg)
![](https://img.shields.io/npm/l/mysql-cache.svg)
[![Known Vulnerabilities](https://snyk.io/test/npm/mysql-cache/badge.svg)](https://snyk.io/test/npm/mysql-cache)

___
# What it does
Automatically caches SELECT sql's in memory, you have serveral cache providers at your disposal and it can even work in clustered mode via redis or mmap!!

This module is wrapping some functions of the [mysql2](https://www.npmjs.com/package/mysql2) module for ease of use

![preview](http://i.imgur.com/BReK4GW.gif)
___
# [Changelog](https://github.com/michaeldegroot/mysql-cache/blob/npm/CHANGELOG.md)

___

#  Getting Started

##### 1. Start by installing the package:
    yarn add mysql-cache

##### 2. Load the code
```javascript
const MysqlCache = require('mysql-cache')

const mysql = new MysqlCache({
    host:            '',
    user:            '',
    password:        '',
    database:        '',
    cacheProvider:   'LRU',
})

mysql.connect(err => {
    if (err) {
        throw err // Catch any nasty errors!
    }
    console.log('W00t! i\'m connected!!')

    // Lets run some queries now!
})
```

##### 3. Do awesome stuff!
```javascript
// Start executing SQL like you are used to using the mysql module

mysql.query('SELECT ? + ? AS solution', [1, 5], (err, res, cache) => {
    if (err) {
        throw new Error(err)
    }
    // Some extra information
    console.log(cache.hash + ' is the cache key')
    console.log(cache.sql + ' was the sql generated and run (if not cached)')
    console.log(cache.isCache + ' boolean if the result was from cache or not')

    // The actual sql result
    console.log(res)

    // This sql was not in the cache and was cached
    // for future references

    // Do something with the output of the sql

    // Later in your code if this exact sql is run again
    // It will be retrieved from your choosen
    // cacheProvider instead of the Mysql database.

    // Can also use a configuration object if you like that :)
    mysql.query({
        sql:    'SELECT ? + ? AS solution',
        params: [1, 5],
    }, (err, res, cache) => {
        if (err) {
            throw new Error(err)
        }
        // This query was retrieved from the cache because it was the
        // exact same sql code, which was much faster call!

        console.log(cache.isCache === true) // Should be true :)

        // Do something with the results
    })
})
```

___
# In-depth configuration

Here you can have a overview of a more defined mysql-cache object

```javascript
const mysql = new MysqlCache({
    // You can put any configuration settings from the mysql package here, they are compatible!

    // Nice error formatting display
    prettyError: true,

    // Do you want to show errors at all when found?
    stdoutErrors: true,

    // Time To Live for a cache key in SECONDS
    // 0 = infinite
    // MMAP is not supported for TTL
    TTL: 0,

    // Mysql connection pool limit
    // Increase value if you are having problems with a lot of queries
    connectionLimit: 100,

    // You can choose a hashing method for the cache key
    // To avoid conflicts sha512 should be really safe, but it's slow!
    // You can choose all the nodejs supported hashing methods as defined
    // In the native crypto module of nodejs itself.

    // Extra hashing methods are also available:
    // farmhash32     https://github.com/lovell/farmhash#hash32input
    // farmhash64     https://github.com/lovell/farmhash#hash64input
    // xxhash         https://cyan4973.github.io/xxHash/

    // Default hashing algorithm is farmhash64
    hashing: 'farmhash64',

    // Do you want console.log's about what the program is doing?
    verbose: true,

    // Do you want to enable caching?
    caching: true,

    // You can choose different cache providers of your liking
    // memcached    https://www.npmjs.com/package/memcached
    // LRU          https://www.npmjs.com/package/lru-cache
    // mmap         https://www.npmjs.com/package/mmap-object works in clustered mode but is using IO!
    // redis        https://www.npmjs.com/package/redis using default 127.00.1 database 1)
    // node-cache   https://www.npmjs.com/package/node-cache
    // file         https://www.npmjs.com/package/cacheman-file
    // native       local variable assignment
    // You can also use mysql.cacheProviders this is a array with strings of the avaliable cacheProviders
    cacheProvider: 'memcached',

    // cacheProviders can be supplied with additional configurations via this variable!
    cacheProviderSetup: {
        // For example when we use memcached (checking the module configuration object) we can do this:
        serverLocation: '127.0.0.1:11211',
        options: {
            retries:10,
            retry:10000,
            remove:true,
            failOverServers:['192.168.0.103:11211'],
        }
    }
})
```
___

#  Automatic package installer
mysql-cache can use some packages that will optimise the performance. This is dependent on your settings but if mysql-cache wants to use a module that is not installed (for example mmap-object, farmhash or xxhash) then it will be Automatically installed, so the first time might run a bit slow. Any warnings or errors are printed to the console, fatal errors will throw a exception

___

#  Promises
mysql-cache uses bluebird to create promises. If you would like to use them just append the word 'Async' to any api call of mysql-cache that you would like to return promises.

__Example__
```Javascript
mysql.connectAsync().then(() => {
    mysql.flushAsync().then(() => {
        mysql.queryAsync({
            sql: 'SELECT from test where name = ?',
            nestTables: true,
            params: [
                'Joe'
            ]
        }).then(result => {
            // Do something with result

            // To get the cache object for extra info:
            console.log(result[1])

            // To get the database result:
            console.log(result[0])
        }).catch(e => {
            // Do something with the error, if it happened
            throw e
        }).finally(() => {
            // this will be always executed
        })
    }).catch(e => {
        // Do something with the error, if it happened
        throw e
    })
}).catch(e => {
    // Do something with the error, if it happened
    throw e
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
```bash
wget http://launchpadlibrarian.net/130794928/libc6_2.17-0ubuntu4_amd64.deb
sudo dpkg -i libc6_2.17-0ubuntu4_amd64.deb
```
##### Getting make errors on yarn/npm install (ubuntu)
```bash
sudo apt-get install python-software-properties
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
sudo apt-get update
sudo apt-get install gcc-5 g++-5
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-5 80 --slave /usr/bin/g++ g++ /usr/bin/g++-5
sudo update-alternatives --config gcc

// (choose gcc-5 from the list)
```
___
## Benchmarks
*Edit the file* **settings.js** *make sure it reflects your mysql database settings*
*Then execute in the mysql-cache root directory:*
```javascript
node benchmark/samequery.js    // Test same repeating select queries
node benchmark/randomquery.js  // Test random select queries
node benchmark/createhash.js   // Test the hash speed
```

Example output:

![cachetest.png](http://i.imgur.com/yxZq9r0.png)
___

## Events

```js
// When you want to know when you are connected
mysql.event.on('connected', () => {
    console.log('We are now connected to the mysql database')
})

// When all the cache gets flushed, by mysql.flush() for example
mysql.event.on('flush', () => {
    console.log('mysql-cache cache was flushed!')
})

// When a cache object was found when a query was run
mysql.event.on('hit', (query, hash, result) => {
    // query  = the sql code that was used
    // hash   = the hash that was generated for the cache key
    // result = the result that was found in the cache
    console.log('mysql-cache hit a cache object!', query, hash, result)
})

// When a cache object was NOT found when a query was run
mysql.event.on('miss', (query, hash, result) => {
    // query  = the sql code that was used
    // hash   = the hash that was generated for the cache key
    // result = the result that will be cached
    console.log('mysql-cache got a miss on a cache object!', query, hash, result)
})

// When a query was run (pre-cache)
mysql.event.on('query', sql => {
    console.log('mysql-cache is going to run a query, it might be cached or not we dont know yet: ' + sql)
})

// When a sql is fired to the database
mysql.event.on('dbQuery', obj => {
    console.log(obj)
})

// When a pool connection is accquired
mysql.event.on('getPool', connection => {
    console.log('Pool connection aqquired!')
    // connection = mysql2 module variable
})

// When a pool connection is closed
mysql.event.on('endPool', connection => {
    console.log('Pool connection was dropped!')
    // connection = mysql2 module variable
})

// When a pool connection has been killed
mysql.event.on('killPool', () => {
    console.log('Pool connection was killed!')
})

// When a cache object will be created
mysql.event.on('create', (hash, val, ttl) => {
    console.log('Creating cache object: ', hash, val, ttl)
})

// When a cache object is about to be retrieved
mysql.event.on('get', hash => {
    console.log('Retrieving cache object: ', hash)
})

// When a cache object key gets deleted by mysql.delKey() for example
mysql.event.on('delete', hash => {
    console.log('this cache object was deleted from cache: ', hash)
})

```

## Properties
```js
// Get total cache misses
console.log(mysql.misses)

// Get total cache hits
console.log(mysql.hits)

// Get total qeury requests
console.log(mysql.queries)

// Get total insert queries run
console.log(mysql.inserts)

// Get total delete queries run
console.log(mysql.deletes)

// Get total delete queries run
console.log(mysql.selects)

// Get total updates queries run
console.log(mysql.updates)

// Get total open pool connections
console.log(mysql.poolConnections)

// Get the configured settings for mysql-cache
console.log(mysql.config)

// Get or set the configured TTL for all future made caches
mysql.config.TTL = 5  // TTL is always defined in SECONDS
console.log(mysql.config.TTL)

// Get the mysql2 package mysql variable
console.log(mysql.mysql)

// Get the cache providers available
console.log(mysql.cacheProviders)
```

## API

###  .query (sql,params,callback,data)
```js
sql:        String    // The sql you want to execute
*params:    Object    // This is used if you want to escape values
callback:   Function  // For getting the (err, res, cache) back of the query.
data:       Object    // One time settings for this query, check below for more
```

\* [More about escaping values by using params](https://github.com/felixge/node-mysql/blob/master/Readme.md#escaping-query-values)

*Will execute the given SQL and cache the (err, res, cache) if it's a SELECT statement.*
*If the SQL was executed before, it will skip the database request and retrieve it from the cache straight away.*
*Invalid queries will throw a error*

__Example #1__

```javascript
mysql.query('SELECT id,username,avatar FROM accounts WHERE id = ?', [530], (err, res, cache) => {
    if (err) {
        throw new Error(err)
    }
    console.log(result)
})
```


__Example #2__

```javascript
mysql.query({
    sql:'SELECT 6 + ? AS solution',
    params: [4],
}, (err, res, cache) => {
    if (err) {
        throw new Error(err)
    }
    console.log(result)
})
```

__Example with one time setting per query__

```javascript

// Setting the TTL
mysql.query('SELECT id, username, avatar FROM accounts WHERE id = ?', [530], (err, res, cache) => {
    if (err) {
        throw new Error(err)
    }
    console.log(result)
}, {
    TTL: 6 // Will set TTL to 6 seconds only for this query
})

// Setting the cache option
mysql.query('SELECT id, username, avatar FROM accounts WHERE id = ?', [530], (err, res, cache) => {
    if (err) {
        throw new Error(err)
    }
    console.log(result)
}, {
    cache: false // Will not cache this query
})

// Setting the cache option alternative method
mysql.query({
    sql:'SELECT 6 + 6 AS solution',
    cache: false, // Do not cache this query
}, (err, res, cacheMysql, mysqlCache) => {
    // Do something with your results
})
```

__Example with error handling__

```javascript
mysql.query('SELECT id, username, avatar FROM accounts WHERE id = ?', [530], (err, res, cache) => {
    if (err) {
        throw new Error(err)
    }
    console.log(result)
})
```

__Example with getting some extra information from mysql-cache__

```javascript
mysql.query('SELECT 6 + 6 AS solution', (err, res, cache) => {
    const mysqlCacheHash = cache.hash.slice(0, 12)
    if (mysqlCache.isCache) {
        console.log(mysqlCacheHash + ': is from the cache!')
    } else {
        console.log(mysqlCacheHash + ': is NOT from the cache!')
    }
    console.log('The result of the sql ' + cache.sql + ' = ' + mysqlResult[0].solution)
})
```

The mysql.query function is using node-mysql for querying.
It's wrapping the sql function, check the [mysql2](https://www.npmjs.com/package/mysql2) [documentation](https://github.com/felixge/node-mysql/blob/master/Readme.md)   for more information about [escaping values](https://github.com/felixge/node-mysql/blob/master/Readme.md#escaping-query-values)

*mysql-cache only supports the use of questionmarks in sql at the moment for escaping values*

___
### .delKey (id,params)
```js
    id:         String    // The sql in string format of the cache key you are trying to delete
    params:     Object    // This is required if the cache key had any questionmarks (params) in the sql
```
_Deletes a cache key in the cache. You will need to supply a SQL format, this function always expects a callback_

__Example #1__

```javascript
mysql.delKey('SELECT id,username,avatar FROM accounts WHERE id = ?', [530], err => {
    if (err) {
        throw new Error(err)
    }
    console.log('key deleted!')
})
```

__Example #2__

```javascript
mysql.delKey({
    sql:    'SELECT id,username,avatar FROM accounts WHERE id = ?',
    params: [530],
}, err => {
    if (err) {
        throw new Error(err)
    }
    console.log('key deleted!')
})
```

This exact SQL is now removed from the cache. Making sure the next time this query is executed it will be retrieved from the database.
___
###  .stats (object)
```js
    object:         boolean    // Print in verbose mode or return as a object
```
_Will console.log() some statistics regarding mysql-cache_

__Example #1__

```javascript
mysql.stats() // default is display via verbose mode
```

__Example #2__

```javascript
console.log(mysql.stats(true))
// Returns: { poolConnections: 0, hits: 3, misses: 1 }
```
___
###  .flush ()
_removes all keys and values from the cache, this function always expects a callback_

__Example__

```javascript
mysql.flush(err => {
    if (err) {
        throw new Error(err)
    }
    console.log('cache flushed!')
})
```
___
###  .killPool ()
_Kills the connection pool_

__Example__

```javascript
mysql.killPool(err => {
    if (err) {
        throw new Error(err)
    }
    console.log('Pool killed!')
})
```

## Important editor notes
#### Refreshing cache objects
A already cached object can be refreshed (retrieve from db and then re-cache):

```javascript
mysql.query({
    sql:          'select 1 + 1 as solution',
    refreshCache: true,
},  (err, res, cache) => {
    if (err) {
        throw new Error(err)
    }
    console.log(result) // Even though the query was cached, it will be retrieved from the database for this call and then be re-cached
})
```

 ___
## Contact
You can contact me at specamps@gmail.com
