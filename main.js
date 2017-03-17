const https = require('https');

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const databox = require('node-databox');

const PORT = process.env.PORT || 8080;

const HTTPS_SERVER_CERT = process.env.HTTPS_SERVER_CERT || '';
const HTTPS_SERVER_PRIVATE_KEY = process.env.HTTPS_SERVER_PRIVATE_KEY || '';

const store = process.env.DATABOX_DRIVER_MOBILE_DATABOX_STORE_BLOB_ENDPOINT;

const app = express();

const credentials = {
	key:  HTTPS_SERVER_PRIVATE_KEY,
	cert: HTTPS_SERVER_CERT,
};

var mobileIP = null;
var sensorStates = {};

function canAccessMobile(callback) {
	if (mobileIP === null) {
		callback(false);
		return;
	}
	request("http://" + mobileIP + ":8080", { timeout: 4000 }, (error) => callback(!error));
}

// TODO: Check
app.enable('trust proxy');
app.disable('x-powered-by');

//app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/ui', express.static('www'));
app.set('views', './views');
app.set('view engine', 'pug');

app.get('/status', function(req, res){
	canAccessMobile((can) => res.send(can ? 'active' : 'standby'));
});

app.get('/ui', function(req, res) {
	canAccessMobile((can) => {
		if (can) {
			request("http://" + mobileIP + ":8080", { timeout: 4000 }, (error, response, body) => {
				if (error) {
					res.render('connect', { ip: mobileIP });
					return;
				}
				let sensors = body.match(/<li>(.*?)<\/li>/g).map((sensor) => sensor.replace(/<(\/?)li>/g, ''));
				res.render('index', { sensors, sensorStates });
			});
			return;
		}
		res.render('connect', { ip: mobileIP });
	});
});

app.get('/ui/set-mobile-ip', function(req, res){
	mobileIP = req.query.ip;
	res.end();
});

app.get('/ui/set-sensor-state', function(req, res){
	sensorStates[req.query.sensor] = JSON.parse(req.query.state);
	res.end();
});


app.post('/api/*', function(req, res){
	request("http://" + mobileIP + ":8080/" + req.params[0]).pipe(res);
});

app.get('/do-stuff', function(req, res){
	Promise.resolve().then(() => {
		console.log('write', store);
		return databox.keyValue.write(store, 'test', { foo: 'bar' });
	}).then((response) => {
		console.log(response);
		console.log('read', store);
		return databox.keyValue.read(store, 'test');
	}).then((response) => {
		console.log(response);
		res.send();
	}).catch((err) => {
		console.error(err);
		res.send();
	});
});

https.createServer(credentials, app).listen(PORT);
