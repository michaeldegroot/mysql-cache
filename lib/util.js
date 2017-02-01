'use strict'

const colors      = require('colors')
const db          = require('../app')
const PrettyError = require('pretty-error')
const pe          = new PrettyError()

pe.appendStyle(require('./prettyError').getTheme())
pe.skipNodeFiles()

exports.doCallback = (cb, a, b, c, d, e, f, g) => {
    if (typeof cb === 'function') {
        cb(a, b, c, d, e, f, g)
    } else {
        return false
    }
}

exports.trace = text => {
    if (exports.verboseMode) {
        console.log(colors.green('MYSQL-CACHE') + ': ' + text)
    }
}

exports.error = (err, sql) => {
    if (err) {
        exports.trace(colors.bold(colors.red('ERROR: ')) + err.code)

        // If there are no listeners, just throw the error
        if (db.event.listeners('error').length <= 0) {
            // Display it nicely with pretty error
            console.log(pe.render(err))

            // Halt application
            throw new Error('mysql-cache halted with fatal error!')
        } else {
            db.event.emit('error', err)
        }
    }
}
