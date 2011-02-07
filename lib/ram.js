var BaseChecker = require('./base_checker');

module.exports = BaseChecker.spawn({
	
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
