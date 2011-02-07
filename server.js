#!/usr/bin/env node

// load requires
http = require('http');
fs = require('fs');
sys = require('sys');
net = require('net');
mailer = require('mailer');
express = require('express'); 
aws = require("aws-lib");

// load config
if (process.argv[2]) {
	var config_file = process.argv[2];
} else {
	var config_file = 'example';
}
sys.log("Loading config '" + config_file + "'")
var config = require('./conf/' + config_file);

FailureReporter = {
	
	report: function(data){		
		// Do something more meaningful
		sys.puts('FAILURE:' + data)
		// ec2 = aws.createSESClient('key', '');
	},
}

ServiceConnection = {
	
	CLIENT: null,
	
	ask: function(server, str, callback){
		sys.log('Asking ' + server + ' for ' + str);
		var self = this;
		self.connect(server);
		self.add_listeners(callback);
		CLIENT.write(str + '\r\n');
	},
	
	connect: function(server){
		var self = this;
		var server_conn = server.split(':');
		CLIENT = net.createConnection(server_conn[1], server_conn[0]);
		CLIENT.setNoDelay();
		CLIENT.setEncoding('ascii');
	},
	
	add_listeners: function(callback){
		var self = this;
		CLIENT.on('data', function(data) {
			return callback(true, data);
		});
		CLIENT.on('error', function(err) {
			return callback(false, err);
		});
	},
			
};

var app = express.createServer();

require('./lib/core');
var BaseChecker = require('./lib/base_checker');

// beanstalkd
var BeanstalkdChecker = require('./lib/beanstalkd');
var beanstalkd_check = [];
config.services.beanstalkd.forEach(function(server, i, a){
	beanstalkd_check[i] = BeanstalkdChecker.spawn({ SERVER: server }).check(config.check_interval);
	app.get('/beanstalkd.json', function(req, res){
		beanstalkd_check[i].web_response(req, res);
	});
});

// redis
var RedisChecker = require('./lib/redis');
var redis_check = [];
config.services.redis.forEach(function(server, i, a){
	redis_check[i] = RedisChecker.spawn({ SERVER: server }).check(config.check_interval);
	app.get('/redis.json', function(req, res){
		redis_check[i].web_response(req, res);
	});
});

// directory existance
var DirChecker = require('./lib/dir');
var dir_check = [];
config.services.dir.forEach(function(dir, i, a){
	dir_check[i] = DirChecker.spawn({ DIR: dir }).check(config.check_interval);
	app.get('/dir.json', function(req, res){
		dir_check[i].web_response(req, res);
	});
});

// RAM free
var RAMChecker = require('./lib/ram');

// app revision
app.get('/revision.json', function(req, res){
	fs.readFile('/var/www/apps/academia.edu/current/REVISION', function(err, data){
		if (err) throw err;
		console.log(data);
		res.send('{"revision": "' + data + '"}', { 'Content-Type': 'application/json' }, 200);
	});
});

app.listen(config.http_port);
