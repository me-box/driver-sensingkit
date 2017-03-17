const https = require('https');

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const PORT = process.env.PORT || 8080;

const HTTPS_SERVER_CERT = process.env.HTTPS_SERVER_CERT || '';
const HTTPS_SERVER_PRIVATE_KEY = process.env.HTTPS_SERVER_PRIVATE_KEY || '';

const app = express();

const credentials = {
	key:  HTTPS_SERVER_PRIVATE_KEY,
	cert: HTTPS_SERVER_CERT,
};

// TODO: Check
app.enable('trust proxy');
app.disable('x-powered-by');

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

https.createServer(credentials, app).listen(PORT);
