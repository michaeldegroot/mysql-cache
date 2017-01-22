'use strict'

const colors = require('colors')

exports.doCallback = (cb, args) => {
    if (typeof cb === 'function') {
        cb(args)
    } else {
        return false
    }
}

exports.getStackTrace = () => {
    const obj = {}

    Error.captureStackTrace(obj)

    return obj.stack
}

exports.trace = text => {
    if (exports.verboseMode) {
        console.log(colors.green('MYSQL-CACHE') + ': ' + text)
    }
}

exports.error = err => {
    if (err) {
        console.log(colors.red('MYSQL-CACHE FATAL ERROR') + ': ' + err)
        throw new Error(err)
    }
}
