var BaseChecker = require('./base_checker');

module.exports = BaseChecker.spawn({
	
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
