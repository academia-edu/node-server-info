var BaseChecker = require('./base_checker');

module.exports = BaseChecker.spawn({
	
	CHECK_TYPE: 'directory existance',

	do_health_checks: function(){
		var self = this;
		self.check_directory_existance();
	},
	
	is_healthy: function(){
		var self = this;
		if (self.DIR_EXISTS == false) {
			self.FAILURE = self.DIR + " doesn't exist";
		};
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
