'use strict'

const colors      = require('colors')
const db          = require('../app')
const PrettyError = require('pretty-error')
const pe          = new PrettyError()

pe.appendStyle(require('./prettyError').getTheme())
pe.skipNodeFiles()

exports.doCallback = (cb, err, b, c, d, e, f, g) => {
    if (err instanceof Error) {
        cb(err)
        exports.error(err)

        return
    }

    if (typeof cb === 'function') {
        cb(err, b, c, d, e, f, g)
    } else {
        return false
    }
}

exports.trace = text => {
    if (exports.verboseMode) {
        console.log(colors.green('MYSQL-CACHE') + ': ' + text)
    }
}

exports.error = err => {
    if (!err) {
        return
    }

    if (err instanceof Error) {
        exports.trace(colors.bold(colors.red('ERROR: ')) + err.code)
    } else {
        exports.trace(colors.bold(colors.red('ERROR: ')) + err)
    }

    // If there are no listeners, we want to do something special
    if (db.event.listeners('error').length <= 0) {
        // Only render with pretty error if instance of a Error
        if (err instanceof Error) {
            // Display it nicely with pretty error
            console.log(pe.render(err))

            // Throw exception if error is fatal
            if (err.fatal) {
                throw new Error('mysql-cache halted with fatal error!')
            }
        } else {
            // create a exception if not a instance of Error
            throw new Error(err)
        }
    } else {
        // This will create a exception anyway
        db.event.emit('error', err)
    }
}
