'use strict'

const colors      = require('colors')
const PrettyError = require('pretty-error')
const path        = require('path')
const pe          = new PrettyError()

pe.appendStyle(require('./prettyError').getTheme())
pe.skipNodeFiles()

const util = {}

util.trace = text => {
    if (util.verboseMode) {
        console.log(colors.bold('MYSQL-CACHE') + ': ' + text)
    }
}

util.error = error => {
    if (error instanceof Error) {
        console.log(pe.render(error))
    } else {
        console.log(pe.render(new Error(error)))
    }

    if (error.fatal) {
        throw new Error('mysql-cache halted with a fatal error.')
    }
}

util.getFileName = (file, extension) => {
    if (!extension) {
        extension = '.js'
    }

    return path.basename(file).replace('.js', '')
}

module.exports = util
