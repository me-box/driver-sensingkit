const https = require('https');
const stream = require('stream');

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const databox = require('node-databox');
const fs = require('fs');

const credentials = databox.getHttpsCredentials();

const PORT = process.env.port || '8080';


const store = process.env.DATABOX_STORE_ENDPOINT;

const app = express();


var mobileIP = null;
var sensors = [];
var sensorStates = {};

function canAccessMobile(callback) {
	if (mobileIP === null) {
		callback(false);
		return;
	}
	request('http://' + mobileIP + ':8080', { timeout: 4000 }, (error, response, body) => {
		if (error) {
			callback(false);
			return;
		}
		let currSensors = body.match(/<li>(.*?)<\/li>/g).map((sensor) => sensor.replace(/<(\/?)li>/g, ''));
		// TODO: See me-box/databox-store-blob #42
		//let oldSensors  = sensor.filter((sensor) => !currSensors.includes(sensor));
		let newSensors  = currSensors.filter((sensor) => !sensors.includes(sensor));
		sensors = currSensors;

		Promise.all(newSensors.map((sensor) => databox.catalog.registerDatasource(store, {
			description: 'Mobile phone ' + sensor + ' sensor',
			contentType: 'text/csv',
			vendor: 'Databox Inc.',
			type: sensor,
			datasourceid: sensor,
			storeType: 'databox-store-blob'
		})));

		callback(true);
	});
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
			res.render('index', { sensors, sensorStates });
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
	let sensor    = req.query.sensor;
	let state     = JSON.parse(req.query.state);
	let prevState = sensorStates[sensor];
	sensorStates[sensor] = state;
	console.log('Sensor', sensor, 'toggled to', state);

	if (!state || prevState) {
		res.send();
		return;
	}

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
			sensorStates[sensor] = false;
			console.error('Failed to open data stream for', sensor + ':', err);
		})
		.pipe(storeStream)
		.on('error', (err) => {
			sensorStates[sensor] = false;
			console.error('Data stream closed for', sensor + ':', err);
		});
});

// NOTE: Technically we should check every time we make request, since the status could change,
//       but then we'd practically double network I/O.
databox.waitForStoreStatus(store, 'active', 10).then(() => {
	https.createServer(credentials, app).listen(PORT);
}).catch((err) => console.error(err));
