const https = require('https');
const stream = require('stream');

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
	request('http://' + mobileIP + ':8080', { timeout: 4000 }, (error) => callback(!error));
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
			request('http://' + mobileIP + ':8080', { timeout: 4000 }, (error, response, body) => {
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
	mobileIP = req.query.ip.trim();
	res.end();
});

app.get('/ui/set-sensor-state', function(req, res){
	let sensor = req.query.sensor;
	let state  = JSON.parse(req.query.state);
	sensorStates[sensor] = state;
	console.log('Sensor', sensor, 'toggled to', state);

	if (state) {
		var storeStream = new stream.Writable();
		storeStream._write = function () {
			var buffer = '';

			return function (chunk, encoding, done) {
				if (!sensorStates[sensor]) {
					done('Sensor ' + sensor + ' toggled off');
					return;
				}

				buffer += chunk.toString();

				if (!~buffer.indexOf('\n')) {
					done();
					return;
				}

				while (~buffer.indexOf('\n')) {
					buffer = buffer.split('\n');
					databox.timeseries.write(store, sensor, buffer.shift().split(','))
						.then(() => done())
						.catch((err) => done(err));

					buffer = buffer.join('\n');
				}
			}
		}();

		console.error('Data stream opening for', sensor);
		request
			.get('http://' + mobileIP + ':8080/' + sensor, { forever: true })
			.on('error', (err) => {
				// TODO: Kill all streams and refresh UI
			})
			.pipe(storeStream)
			.on('error', (err) => {
				console.error('Data stream closed for', sensor + ':', err);
			});
	}
	res.end();
});

// NOTE: Technically we should check every time we make request, since the status could change,
//       but then we'd practically double network I/O.
databox.waitForStoreStatus(store, 'active').then(() => {
	https.createServer(credentials, app).listen(PORT);
}).catch((err) => console.error(err));
