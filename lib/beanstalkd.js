var BaseChecker = require('./base_checker');

module.exports = BaseChecker.spawn({

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
				self.FAILURE = self.TUBE_JOBS.sum() + ' queued jobs\n\n';
				self.TUBES.forEach(function(e, i, a){
					self.FAILURE += '  ' + e + ': ' + self.TUBE_JOBS[i];
				});
				self.FAILURE += ''
				return false;
			} else {
				return true;
			};
		} else {
			self.FAILURE = "refused connection";
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
