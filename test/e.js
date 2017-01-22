'use strict'

const assert = require('assert-plus')
const appRoot  = require('app-root-path')
const db       = require(appRoot + '/app')
const settings = require(appRoot + '/settings/settings').settings()

describe('error messages test #2', function() {
    this.timeout(15000)
    it('create a unknown cacheProvider error', () => {
        assert.throws(() => {
            settings.cacheProvider = 'thisdoesnotexists'
            db.init(settings)
        })
    })
})
