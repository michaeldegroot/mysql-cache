var db = require('../app.js');
var assert = require('assert');
var assert = require('assert-plus');

it('Fake db connect', function(done){
	this.timeout(15000);
	
	db.init({
		host: 'kappa',
		user: 'root',
		password: '',
		database: 'mysqlcache',
		TTL: 0,
		connectionLimit: 100,
		verbose: true, 
		caching: true
	});
	db.testConnection(function(res){
		console.log(res);
	});
	setTimeout(function(){
		done();
	},6000);
});