var argv = require('optimist').argv
var async = require('async')
var moment = require('moment')

// Require the module.
var db = require('./app.js')

// Setup some information.
db.init({
    host: argv.host,
    user: argv.user,
    password: argv.pass,
    database: argv.database,
    TTL: 0,
    connectionLimit: 100,
    verbose: false,
    caching: true
})

var querys = 0
var amount = 1000
noCacheTest(amount)
function noCacheTest(amount){
    console.log("------------- NO CACHE TEST ----------")
    var now = moment()
    var asynctext = "async.series(["
    for(i=0;i<amount;i++){
        asynctext += "function(callback){test(callback,false)},"
    }
    asynctext += "], function(results){var then = moment();var diff = then.diff(now);console.log('Without caching, '+amount+' queries took: '+diff+'ms');cacheTest(amount)});"
    eval(asynctext)
}

function cacheTest(amount){
    console.log("------------- CACHE TEST -------------")
    var now = moment()
    var asynctext = "async.series(["
    for(i=0;i<amount;i++){
        asynctext += "function(callback){test(callback,true)},"
    }
    asynctext += "], function(results){var then = moment();var diff = then.diff(now);console.log('With caching, '+amount+' queries took: '+diff+'ms');});"
    eval(asynctext)

}

function test(callback,cache){
        db.query("SELECT ? + ? AS solution",[420, 420],function(ret){
            querys++
            process.stdout.write("Executing query: "+querys+" / "+amount+" \033[0G")
            callback()
        },{cache:cache})
}
