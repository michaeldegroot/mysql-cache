exports.settings = () => {
    return {
        host: '127.0.0.1',
        user: 'root',
        password: 'root',
        database: 'mysqlcache',
        TTL: 0,
        connectionLimit: 100,
        verbose: true,
        caching: true
    }
}
