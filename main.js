const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

let app = express();

app.use(express.static('static'));

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/*', function(req, res, next){
	res.header('Access-Control-Allow-Origin', '*');
	next();
});

app.get('/status', function(req, res){
	if (mobileIp == null) {
		res.send('standby');
		return;
	}
	request("http://" + mobileIp + ":8080", function(error, response, body){
		res.send(typeof err != 'undefined' && err !== null ? 'standby' : 'active');
	});
});

app.post('/api/*', function(req, res){
	request("http://" + mobileIp + ":8080/" + req.params[0]).pipe(res);
});

app.get('/is-connected', function(req, res){
	if (mobileIp == null) {
		res.send('false');
		return;
	}
	request("http://" + mobileIp + ":8080", function(error, response, body){
		res.send('' + (error == null));
	});
});

app.get('/set-mobile-ip', function(req, res){
	mobileIp = req.query.ip;
	res.end();
});

app.listen(8080);
