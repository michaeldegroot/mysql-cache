'use strict'

const colors      = require('colors')
const PrettyError = require('pretty-error')

class Util {
    constructor(config) {
        this.settings = config
        this.pe       = new PrettyError()

        this.pe.appendStyle(require('./prettyError').getTheme())
        this.pe.skipNodeFiles()
    }

    trace(text) {
        if (this.settings.hasOwnProperty('verbose')) {
            if (this.settings.verbose) {
                console.log(colors.bold('MYSQL-CACHE') + ': ' + text)
            }
        }
    }

    error(error, cb) {
        let printErrors = null

        this.trace(colors.red('Error!'))

        if (this.settings.hasOwnProperty('stdoutErrors')) {
            printErrors = this.settings.stdoutErrors
        }

        // prettyError
        if (this.settings.hasOwnProperty('prettyError')) {
            if (this.settings.prettyError) {
                if (printErrors) {
                    if (error instanceof Error) {
                        console.log(this.pe.render(error))
                    } else {
                        console.log(this.pe.render(new Error(error)))
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
            if (typeof cb === 'function') {
                cb(error)
            }
        }
    }
}

module.exports = Util
