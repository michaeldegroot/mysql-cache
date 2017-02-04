'use strict'

const colors      = require('colors')
const PrettyError = require('pretty-error')
const path        = require('path')
const db          = require('../app')
const pe          = new PrettyError()

pe.appendStyle(require('./prettyError').getTheme())
pe.skipNodeFiles()

const util = {}

util.trace = text => {
    if (util.verboseMode) {
        console.log(colors.bold('MYSQL-CACHE') + ': ' + text)
    }
}

util.error = (error, cb) => {
    let printErrors = null

    util.trace(colors.red('Error!'))

    if (db.config.hasOwnProperty('stdoutErrors')) {
        printErrors = db.config.stdoutErrors
    }

    // prettyError
    if (db.config.hasOwnProperty('prettyError')) {
        if (db.config.prettyError) {
            if (printErrors) {
                if (error instanceof Error) {
                    console.log(pe.render(error))
                } else {
                    console.log(pe.render(new Error(error)))
                }
            }
        } else {
            if (printErrors) {
                console.error(error)
            }
        }
    }

    if (error.fatal) {
        throw new Error('mysql-cache halted with a fatal error.')
    } else {
        cb(error)
    }
}

util.getFileName = (file, extension) => {
    if (!extension) {
        extension = '.js'
    }

    return path.basename(file).replace('.js', '')
}

module.exports = util
