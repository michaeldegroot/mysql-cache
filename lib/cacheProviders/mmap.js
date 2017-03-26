'use strict'

let cache = {}

exports.setup = (config, parent) => {
    return parent.usePackage('mmap-object', (err, module) => {
        if (err) {
            parent.trace(`Warning when installing module 'mmap-object': ${err}`)
        }

        cache = new module.Create('mysqlcache')
    })
}

exports.flush = (obj, cb) => {
    cache = {}

    process.nextTick(() => {
        cb(null, true)
    })
}

exports.set = (obj, cb) => {
    try {
        cache[obj.hash] = JSON.stringify(obj.val)
    } catch (e) {
        cb(new Error('Could not JSON.stringify value' + e.toString()))

        return
    }

    cb(null, true)
}

exports.get = (obj, cb) => {
    if (cache[obj.hash] !== undefined) {
        try {
            JSON.parse(cache[obj.hash])
        } catch (e) {
            cb(new Error('Could not JSON.parse result: ' + e.toString()))

            return
        }
        cb(null, JSON.parse(cache[obj.hash]))
    } else {
        cb()
    }
}

exports.remove = (obj, cb) => {
    delete cache[obj.hash]

    process.nextTick(() => {
        cb(null, true)
    })
}
