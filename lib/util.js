'use strict'

const colors      = require('colors')
const db          = require('../app')
const PrettyError = require('pretty-error')
const pe          = new PrettyError()

pe.appendStyle(require('./prettyError').getTheme())
pe.skipNodeFiles()

process.on('uncaughtException', error => {
    console.log(pe.render(error))
})

exports.trace = text => {
    if (exports.verboseMode) {
        console.log(colors.green('MYSQL-CACHE') + ': ' + text)
    }
}
