module.exports = {
	
	http_port: 80,
	check_interval: 60000,
	services: {
		beanstalkd: ['server.com:11300'],
		redis: ['server.com:6379', 'redis2.server.com:6379', 'redis.server.com:6380'],
		dir: ['/mnt/something'],
	},
	ec2_key: 'KEYKEYKEY',
	ec2_secret: 'SECRETSECRETSECRET',

};
