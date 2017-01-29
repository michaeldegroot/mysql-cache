'use strict'

const assert = require('assert-plus')
const appRoot  = require('app-root-path')
const db       = require(appRoot + '/app')
const settings = require(appRoot + '/settings').settings()

db.event.on('error', err => {
    throw new Error(err)
})

describe('Random Error Message Suite 1#', function() {
    this.timeout(15000)
    it('create a cacheProvider error', () => {
        assert.throws(() => {
            delete settings.cacheProvider
            db.init(settings)
        })
    })
})
