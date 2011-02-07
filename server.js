#!/usr/bin/env node

var http = require('http');
var fs = require('fs');
var sys = require('sys');
var net = require('net');
var express = require('express'); 
// var io = require('socket.io');

// var aws = require("aws-lib");
// ec2 = aws.createSESClient('0XGAZE282T5ZEMSNEY02', 'r9Trowhb/AQKzfdaCIKl6YK1m017rvV+YtvOJlh/');

var FailureReporter = {
	
	report: function(data){
		// Do something more meaningful
		sys.puts('FAILURE:' + data)
	},
}

var ServiceConnection = {
	
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

// prototype inheritance - stolen from http://howtonode.org/prototypical-inheritance
Object.defineProperty(Object.prototype, "spawn", {value: function (props) {
  var defs = {}, key;
  for (key in props) {
    if (props.hasOwnProperty(key)) {
      defs[key] = {value: props[key], enumerable: true};
    }
  }
  return Object.create(this, defs);
}});

Array.prototype.sum = function() {
  return (! this.length) ? 0 : this.slice(1).sum() +
      ((typeof this[0] == 'number') ? this[0] : 0);
};

var BaseChecker = {
	
	TYPE: null,
	SERVER: null,
	CHECK_START: null,
	CHECK_LAST: null,
	CHECK_INTERVAL: null,
	MY_TIME: null,
	CHECK_AGE: null,
	HEALTHY: null,
	SERVER: 'localhost',
	
	check: function(delay){
		var self = this;
		if (delay) {
			self.start_checking(delay);
		};
		return self;
	},
	
	start_checking: function(delay){
		var self = this;
		sys.log('Starting ' + self.CHECK_TYPE + ' checks of ' + self.SERVER + ' every ' + delay + ' ms');
		self.CHECK_START = new Date();
		self.check_health();
		self.CHECK_INTERVAL = setInterval(self.check_health, delay, self)
	},
	
	stop_checking: function(){
		var self = this;
		sys.log('Stopping checks of ' + self.SERVER);
		clearInterval(self.CHECK_INTERVAL);
	},
	
	check_health: function(self){
		if (!self) {
			var self = this;
		};
		sys.log('Checking health of ' + self.SERVER)
		self.do_health_checks();
		self.HEALTHY = self.is_healthy();
		if (self.HEALTHY == false) {
			FailureReporter.report(self.SERVER);
		};
	},
	
	get_health: function(){
		var self = this;
		self.HEALTHY = self.is_healthy();
		self.MY_TIME = new Date();
		self.CHECK_AGE = self.MY_TIME - self.CHECK_LAST;
	},
	
	web_response: function(req, res){
		var self = this;
		self.get_health();
		var code;
		if (self.HEALTHY == true) {
			code = 200;
		} else {
			code = 501
		};
		res.send(self, code)
	},
	
	ask_server: function(str, callback){
		var self = this;
		ServiceConnection.ask(self.SERVER, str, function(succ, response){
			if (succ == true) {
				return callback(response);
			} else {
				return callback(false);
			};
		});
	},
	
};

var BeanstalkdChecker = BaseChecker.spawn({
	
	CHECK_TYPE: 'beanstalkd',
	
	TUBES: [],
	TUBE_JOBS: [],
	
	do_health_checks: function(){
		var self = this;
		sys.log(self.TUBE_JOBS);
		self.get_tubes(function() {
			self.get_tube_stats();
		});
	},
	
	is_healthy: function(){
		var self = this;
		if (self.TUBES.length > 0) {
			if (self.TUBE_JOBS.sum() > 1000) {
				return false;
			} else {
				return true;
			};
		} else {
			return false;
		}
	},
	
	get_tubes: function(callback){
		var self = this;
		sys.log('Getting tubes');
		self.ask_server('list-tubes', function(response){
			if (response != false) {
				self.TUBES = [];
				response.trim().split(/\n/).forEach(function(e, i, a){
					if (i > 1) {
						tube = e.split(/-\s+/)[1];
						self.TUBES.push(tube);
					};
				});
				return callback();
			};
		});
	},
		
	get_tube_stats: function(){
		var self = this;
		sys.log('Getting tube stats');
		self.TUBES.forEach(function(tube, i, a){
			self.ask_server('stats-tube ' + tube, function(response){
				var jobs = self.parse_tube_stats_response(response);
				if (jobs) {
					self.TUBE_JOBS[i] = jobs;
				};
			});
		});
	},
	
	parse_tube_stats_response: function(response){
		if (response != false) {
			var jobs_ready = 0;
			response.trim().split(/\n/).forEach(function(e, i, a){
				if (i > 1) {
					stat = e.split(/\s/);
					if (stat[0] == 'current-jobs-ready:') {
						jobs_ready = parseInt(stat[1]);
					};
				};
			});
			return jobs_ready;
		} else {
			return null;
		}
	},
	
});
var RedisChecker = BaseChecker.spawn({
	
	CHECK_TYPE: 'redis',
		
	do_health_checks: function(){
		var self = this;
		self.get_last_save_time();
		// self.get_info();
	},
	
	is_healthy: function(){
		return true;
	},
	
	get_last_save_time: function(){
		var self = this;
		sys.log('Getting last save time');
		self.ask_server('LASTSAVE', function(response){
			var ts = Math.round(new Date().getTime() / 1000);
			self.LAST_SAVE_TIME = response.trim().split(/\:/)[1];
			self.LAST_SAVE_AGE = ts - self.LAST_SAVE_TIME;
		});
	},
	
	get_info: function(){
		var self = this;
		sys.log('Getting INFO');
		self.ask_server('INFO', function(response){
			self.INFO = response.trim();
		});
	},
	
});

var RAMChecker = BaseChecker.spawn({
	
	CHECK_TYPE: 'RAM',
	
	do_health_checks: function(){
		var self = this;
	},
	
	is_healthy: function(){
		return true;
	},
	
	get_free_memory: function(){
		self.RAM_FREE = '92';
	},
	
});

var DirChecker = BaseChecker.spawn({
	
	CHECK_TYPE: 'directory existance',

	do_health_checks: function(){
		var self = this;
		self.check_directory_existance();
	},
	
	is_healthy: function(){
		var self = this;
		return self.DIR_EXISTS;
	},
	
	check_directory_existance: function(){
		var self = this;
		fs.stat(self.DIR, function (err, stats) {
			if (stats) {
				self.DIR_EXISTS = stats.isDirectory();
			} else {
				self.DIR_EXISTS = false;
			};
		});
	},
	
});

var app = express.createServer();
var DEAFULT_CHECK_INTERVAL = 5000;

// app revision
app.get('/revision.json', function(req, res){
	fs.readFile('/var/www/apps/academia.edu/current/REVISION', function(err, data){
		if (err) throw err;
		console.log(data);
		res.send('{"revision": "' + data + '"}', { 'Content-Type': 'application/json' }, 200);
	});
});

// ebs volume mounted
var ebs_mounted_check = DirChecker.spawn({ DIR: '/mnt/datastore' }).check(DEAFULT_CHECK_INTERVAL);
app.get('/mnt.json', function(req, res){
	ebs_mounted_check.web_response(req, res);
});

// beastalkd
var beanstalkd_check_bear = BeanstalkdChecker.spawn({ SERVER: 'bea2r.academia.me:11300' }).check(DEAFULT_CHECK_INTERVAL);
app.get('/b.json', function(req, res){
	beanstalkd_check_bear.web_response(req, res);
});

// redis
// robin
var redis_check_robin = RedisChecker.spawn({ SERVER: 'robin.academia.me:6379' }).check(DEAFULT_CHECK_INTERVAL);
app.get('/robin.json', function(req, res){
	redis_check_robin.web_response(req, res);
});
// reindeer
var redis_check_reindeer = RedisChecker.spawn({ SERVER: 'reindeer.academia.me:6379' }).check(DEAFULT_CHECK_INTERVAL);
app.get('/reindeer.json', function(req, res){
	redis_check_reindeer.web_response(req, res);
});

// // RAM
var ram_check_local = RAMChecker.spawn({}).check(DEAFULT_CHECK_INTERVAL);
app.get('/ram.json', function(req, res){
	ram_check_local.web_response(req, res);
});


app.listen(2932);
