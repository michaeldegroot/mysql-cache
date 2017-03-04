
#  New in version 2.0.0 :rocket:
Multiple instances can now be created, some code has changed because of this.

 - You can ask mysql-cache to not cache a result

```javascript
mysql.query({
    sql:'SELECT 6 + 6 AS solution',
    cache: false, // Do not cache this result
}, (err, resultMysql, mysqlCache) => {
    // Do something with your results
})
```

 - There is no more .start or .init

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
 - Connected: when you want to know when a connection has been established with mysql
 - Error: when a error occurred within mysql-cache 
 - Miss: when a cache object was not found
 - Flush: when the cache was flushed
 - Delete: when a cache was delete
 - Hit: when a cache object was found
 - Query: when a query is going to be run, before the cache check and cache object key generation
