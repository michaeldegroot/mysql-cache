const db     = require('../app')
const assert = require('assert-plus')
const settings = require('./settings').settings()

describe('error messages test #1', function() {
    this.timeout(15000)
    it('create a cacheProvider error', () => {
        assert.throws(() => {
            delete settings.cacheProvider
            db.init(settings)
        })
    })
})
