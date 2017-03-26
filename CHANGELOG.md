#  New in version 2.1.2 :rocket:
#### Optional package installer

Modules like farmhash, xxhash and mmap-object will now be automatically  installed. But only if the module is about to be used, so these packages are now optional and will not cause any problems for people that can't compile them.

Thanks to the module 'install-package' !

```javascript
    /**
     * Uses or installs a package
     */
    usePackage(moduleName, cb) {
        try {
            require.resolve(moduleName)
        } catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                this.trace(`Module ${moduleName} not installed, installing...`)

                return install(moduleName).then(result => {
                    cb(result.stderr, require(moduleName))
                }).catch(e => {
                    cb(e, null)
                })
            } else {
                throw new Error(e)
            }
        }

        return cb(null, require(moduleName))
    }
```

#### Cache zones added
Can now define cache zones: all queries that are execute with a zone definition will be saved and grouped in a 'zone group' you can easily clear the cache of a whole zone with the new api features:

```javascript
    mysql.query({
        sql: 'SELECT ? + ? AS solution',
        params: [1, 5],
        zone: 'mycoolzone', // Define a zone
    }, (err, res, cache) => {
        if (err) {
            throw err
        }
        mysql.query({
            sql: 'SELECT ? + ? AS solution',
            params: [42, 0],
            zone: 'mycoolzone', // Use the same zone
        }, (err, res, cache) => {
            if (err) {
                throw err
            }

            // Now clear both cache easily:
            mysql.clearZone('mycoolzone', err => {
                if (err) {
                    throw err
                }
            })

            // Or request all hashes in this zone
            mysql.zone('mycoolzone', (err, hashes) => {
                if (err) {
                    throw err
                }

                console.log(hashes) // Returns: [32498549932, 0909210054] 
            })
        })
    })
```


#  New in version 2.1.1 :rocket:
#### Disconnect function added

```javascript
mysql.connectAsync().then(connected => {
    if (connected) {
        mysql.disconnectAsync().then(() => {
            // Now fully disconnected from mysql
        }).catch(err => {
            console.error('Could not disconnect:', err)
        })
    }
}).catch(err => {
    console.error('Could not connect:', err)
})
```
#### xxhash added
A new hashing algorithm for cache keys as been added to choose from, xxhash:
https://cyan4973.github.io/xxHash/

#### Farmhash added
Now the default hashing algorithm for cache keys (hashfarm64), Very fast!
https://github.com/lovell/farmhash

#### Benchmarks fixed
cacheProvider module was also being cached, resulting in wrong benchmark tests!

#### dbQuery event added

```javascript
mysql.event.on('dbQuery', info => {
    console.log('Mysql call has been fired', info)
})
```

*Called when a sql query was fired to the mysql database, as apposed to the query event; which is before the pre-cache check*

#  New in version 2.1.0 :rocket:

#### Pretty Error has been removed
There is no good support for throwing pretty error objects

#### Can refresh a existing cached object
A already cached object can be refreshed from the database:

```javascript
mysql.query({
    sql:          'select 1 + 1 as solution',
    refreshCache: true,
},  (err, result) => {
    if (err) {
        throw new Error(err)
    }
    console.log(result) // Even though the query was cached, it will be retrieved from the database for this call and then be re-cached
})
```

#### stdoutErrors config settings removed
All error callbacks now return a error object, nothing is printed to console

#### There is no more auto connect, you will have to initialize the connection yourself

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
    console.log('W00t! i\'m connected!!')

    // Lets run some queries now!
})
```

#### Query callback returns only one variable now

*Previously*

```Javascript
mysql.query(someObject, (err, result, mysqlCache) => {
    console.log('database result: ', result)
    console.log('mysql-cache cached: ', mysqlCache.isCache)
    console.log('mysql-cache hash: ', mysqlCache.hash)
})
```

*Now*

```Javascript
mysql.query(someObject, (err, result) => {
    console.log('database result: ', result)
    console.log('mysql-cache cached: ', result._cache.isCache)
    console.log('mysql-cache hash: ', result._cache.hash)
})
```

#### Promises have been implemented via the bluebird module!

 append the word 'Async' to any api call of mysql-cache and start using promises!

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
        }).catch(e => {
            throw e
        }).finally(() => {
            // this will be always executed, even if it errors
        })
    }).catch(e => {
        throw e
    })
}).catch(e => {
    // Do something with the error, if it happened
    throw e
})
```

#  New in version 2.0.2 :rocket:

#### New cacheProvider

New cacheProvider added: memcached!

#  New in version 2.0.0 :rocket:
Multiple instances can now be created, some code has changed because of this.

#### You can ask mysql-cache to not cache a result

```javascript
mysql.query({
    sql:'SELECT 6 + 6 AS solution',
    cache: false, // Do not cache this result
}, (err, resultMysql, mysqlCache) => {
    // Do something with your results
})
```

#### There is no more .start or .init

You now create a new mysqlCache instance like so:

```javascript
// Require mysqlCache
const MysqlCache = require('mysql-cache')

// Create a new instance with settings
const mysql = new MysqlCache({
    host: '127.0.0.1',
    // Other settings etc...
})

// Listen for the connected event, this means you are ready to send queries
mysql.event.on('connected', () => {
    mysql.query('SELECT 133 + 7 AS solution', (err, result, mysqlCache) => {
        if (err) {
            throw new Error(err)
        }
        // Do something with the results
    })
})
```

#  New in version 1.0.0 :rocket:
cacheProviders, improved error handling and event emitters!

#### Cache Providers:
You are no longer binded to node-cache, you can now choose the following cache providers:
 - [LRU](https://www.npmjs.com/package/lru-cache)
 - [mmap](https://www.npmjs.com/package/mmap-object)
 - [redis](https://www.npmjs.com/package/redis)
 - [node-cache](https://www.npmjs.com/package/node-cache)
 - [file](https://www.npmjs.com/package/cacheman-file)
 - native (local variable assignment)

 **Important** If you want to use mmap you have to install the dependency: `
    yarn add mmap-object@1.1.1`

#### Events:
 - connected: when you want to know when a connection has been established with mysql
 - miss: when a cache object was not found
 - flush: when the cache was flushed
 - delete: when a cache was delete
 - hit: when a cache object was found
 - query: when a query is run, before the cache check and cache object key generation
