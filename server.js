#!/usr/bin/env node

var http = require('http');
var fs = require('fs');
var express = require('express'); 
var io = require('socket.io');
  
var app = express.createServer();

app.get('/revision.json', function(req, res){
	fs.readFile('/var/www/apps/academia.edu/current/REVISION', function(err, data){
		if (err) throw err;
		console.log(data);
		res.send('{"revision": "' + data + '"}', { 'Content-Type': 'application/json' }, 200);
	});
});

app.listen(80);
