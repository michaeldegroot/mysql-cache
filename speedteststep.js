'use strict'

let progress

exports.start = (todo) => {
    progress = require('pace')(todo)
}

exports.tick = () => {
    progress.op()
}

exports.finish = () => {
}
