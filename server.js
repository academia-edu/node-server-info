#!/usr/bin/env node

// load requires
http = require('http');
fs = require('fs');
sys = require('sys');
exec = require('child_process').exec;
net = require('net');
mailer = require('mailer');
express = require('express'); 
// aws = require("aws-lib");

// load config
if (process.argv[2]) {
	var config_file = process.argv[2];
} else {
	var config_file = 'example';
}
sys.log("Loading config '" + config_file + "'")
var config = require('./conf/' + config_file);

FailureReporter = {
	
	report: function(server, failure){	
		var self = this;
		var subject = 'Check failure on ' + server
		if (my_hostname) {
			subject = '[ ' + my_hostname + ' ] Check failure on ' + server;
		};
		sys.log('FAILURE: ' + subject)
		if (config.smtp && config.email_failures) {
			self.send_email(server, subject, failure);
		};
	},
	
	send_email: function(server, subject, failure){
		var msg = {
			host: config.smtp.address,
			port: config.smtp.port,
			domain: config.smtp.domain,
			authentication: 'login',
			username: Buffer(config.smtp.username).toString('base64'),
			password: Buffer(config.smtp.password).toString('base64'),
			to: config.email_failures,
			from: config.smtp.from,
			subject: subject,
			body: failure,
		};
		mailer.send(msg, function(err, result){
			if(err){ sys.log(err); }
		});
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

var SystemCommand = {
	
	ask: function(cmd, callback){
		exec(cmd, function (err, stdout, stderr) {
			if (stderr) {
				return callback(false, stderr);
			} else {
				return callback(true, stdout);
			};
		});
	},
}

var MonitoredServices = {
	
	SERVICES: [],
	
	add: function(short_name){
		var self = this;
		self.SERVICES.push(short_name);
		sys.log('/' + short_name + '.json avaiable');
	},
}

var app = express.createServer();

require('./lib/core');
var BaseChecker = require('./lib/base_checker');

var my_hostname = null;
SystemCommand.ask('hostname', function(succ, response) {
	if (succ) {
		my_hostname = response.trim();
	};
})

// beanstalkd
if (config.services.beanstalkd) {
	var BeanstalkdChecker = require('./lib/beanstalkd');
	var beanstalkd_check = [];
	config.services.beanstalkd.forEach(function(server, i, a){
		beanstalkd_check[i] = BeanstalkdChecker.spawn({ SERVER: server }).check(config.check_interval);
		var short_name = server.split(/\./)[0];
		MonitoredServices.add(short_name);
		app.get('/' + short_name +'.json', function(req, res){
			beanstalkd_check[i].web_response(req, res);
		});
	});
};

// redis
if (config.services.redis) {
	var RedisChecker = require('./lib/redis');
	var redis_check = [];
	config.services.redis.forEach(function(server, i, a){
		redis_check[i] = RedisChecker.spawn({ SERVER: server }).check(config.check_interval);
		var short_name = server.split(/\./)[0];
		MonitoredServices.add(short_name);
		app.get('/' + short_name + '.json', function(req, res){
			redis_check[i].web_response(req, res);
		});
	});
};

// directory existance
if (config.services.dir) {
	var DirChecker = require('./lib/dir');
	var dir_check = [];
	config.services.dir.forEach(function(dir, i, a){
		dir_check[i] = DirChecker.spawn({ DIR: dir }).check(config.check_interval);
		app.get('/dir.json', function(req, res){
			dir_check[i].web_response(req, res);
		});
	});
};

// RAM free
if (config.services.dir) {
	var RAMChecker = require('./lib/ram');
	var ram_check = [];
};

// app revision
app.get('/revision.json', function(req, res){
	fs.readFile('/var/www/apps/academia.edu/current/REVISION', function(err, data){
		if (err) throw err;
		console.log(data);
		res.send('{"revision": "' + data + '"}', { 'Content-Type': 'application/json' }, 200);
	});
});

// root
app.get('/', function(req, res){
	var links = [];
	MonitoredServices.SERVICES.forEach(function(e, i, a){
		links.push("<a href='" + e + ".json'>" + e + ".json</a>")
	});
	res.send(links);
});


app.listen(config.http_port);
