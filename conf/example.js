module.exports = {
	
	http_port: 80,
	check_interval: 60,
	grace_time: 120,
	services: {
		beanstalkd: ['server.com:11300'],
		redis: ['server.com:6379', 'redis2.server.com:6379', 'redis.server.com:6380'],
		dir: ['/mnt/something'],
	},
	ec2_key: 'KEYKEYKEY',
	ec2_secret: 'SECRETSECRETSECRET',
	email_failures: 'team@server.com',
	smtp: {
		address: 'smtp.server.com',
        port: '25',
        domain: 'server.com',
        username: 'user',
        password: 'pass',
		from: 'notifier@server.com',
	},

};
