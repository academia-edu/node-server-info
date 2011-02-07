module.exports = {
	
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