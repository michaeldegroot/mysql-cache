const db     = require('../app')
const assert = require('assert-plus')
const settings = require('./settings').settings()

describe('error messages test #2', function() {
    this.timeout(15000)
    it('create a unknown cacheProvider error', () => {
        assert.throws(() => {
            settings.cacheProvider = 'thisdoesnotexists'
            db.init(settings)
        })
    })
})
