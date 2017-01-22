exports.settings = () => {
    return {
        host: '127.0.0.1',
        user: 'root',
        password: 'developer',
        database: 'mysqlcache',
        TTL: 0,
        connectionLimit: 10000,
        verbose: true,
        caching: true,
        cacheProvider: 'node-cache'
    }
}
