'use strict'

const colors      = require('colors')
const PrettyError = require('pretty-error')
const pe          = new PrettyError()

pe.appendStyle(require('./prettyError').getTheme())
pe.skipNodeFiles()

exports.trace = text => {
    if (exports.verboseMode) {
        console.log(colors.bold('MYSQL-CACHE') + ': ' + text)
    }
}

exports.error = error => {
    if (error instanceof Error) {
        console.log(pe.render(error))
    } else {
        console.log(pe.render(new Error(error)))
    }

    if (error.fatal) {
        throw new Error('mysql-cache halted with a fatal error.')
    }
}
