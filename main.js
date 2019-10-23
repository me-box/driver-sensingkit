const https = require('https');
const express = require('express');
const databox = require('node-databox');

const credentials = databox.GetHttpsCredentials();
const PORT = process.env.port || '8080';
const DATABOX_ZMQ_ENDPOINT = process.env.DATABOX_ZMQ_ENDPOINT
const DATABOX_ARBITER_ENDPOINT = process.env.DATABOX_ARBITER_ENDPOINT

const app = express();

let sensors = [];
let sensorStates = {};

app.enable('trust proxy');
app.disable('x-powered-by');

app.use('/ui', express.static('www'));
app.set('views', './views');
app.set('view engine', 'pug');

app.get('/status', (req, res) => {
	res.send('active');
});

app.get('/ui', (req, res) => {
	res.render('index', {sensors, sensorStates});
});

//connect to the store
let store = databox.NewStoreClient(DATABOX_ZMQ_ENDPOINT, DATABOX_ARBITER_ENDPOINT, false);

let DEFAULT_SENSORS = ['light', 'gravity', 'battery', 'accelerometer', 'step_counter'];

function registerSensor(sensor) {
	if (!sensors.includes(sensor)) {
		console.log("Register " + sensor);
		let metadata = databox.NewDataSourceMetadata();
		metadata.Description = 'Mobile phone ' + sensor + ' sensor';
		metadata.ContentType = 'text/csv';
		metadata.Vendor = 'Databox Inc.';
		metadata.Unit = '';
		metadata.DataSourceType = sensor;
		metadata.DataSourceID = sensor;
		metadata.StoreType = 'ts/blob';
		store.RegisterDatasource(metadata)
		.catch((err)=>{
			console.log("Error registering sensor ", sensor);
		})
		sensors.push(sensor);
	}	
}

for (let sensor of DEFAULT_SENSORS) {
	registerSensor(sensor);
}

app.post('/ui/:sensor/data', (req, res) => {
	const sensor = req.params.sensor.toLocaleLowerCase().replace(' ','_');
	console.log("Receiving " + sensor + " data");
	let buffer = '';

	registerSensor(sensor);

	req
		.on('data', function (chunk) {
			buffer += chunk;
			if (!~buffer.indexOf('\n')) {
				return;
			}

			buffer = buffer.split('\n')
			while (buffer.length > 0) {
				let row = buffer.shift()
				if (row.length == 0)
					continue
				try {
					// time,value
					let values = row.split(',')
					// TS must have a single number value and optional string tag (1 only)
					// so we stick to TSBlob for now.
					// like the old version we leave them as strings for now.
					let data = values
					console.log("Sending " + sensor + " data: " + JSON.stringify(data));
					// could use WriteAt use device time in store
					store.TSBlob.Write(sensor, data)
					.catch((err) => console.log('error writing data', err));
				} catch (err) {
					console.log('error handling ' + sensor + ' value ' + row + ': ', err)
				}
			}
		})
		.on('end', function () {
			res.status(200);
			res.send("Success");
		});
});

//start the http server
https.createServer(credentials, app).listen(PORT);
