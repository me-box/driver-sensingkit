const https = require('https');
const express = require('express');
const databox = require('node-databox');

const credentials = databox.getHttpsCredentials();
const PORT = process.env.port || '8080';
const DATABOX_ZMQ_ENDPOINT = process.env.DATABOX_ZMQ_ENDPOINT

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

app.post('/ui/:sensor/data', (req, res) => {
	const sensor = req.params.sensor.toLocaleLowerCase();
	console.log("Receiving " + sensor + " data");
	let buffer = '';

	if (!sensors.includes(sensor)) {
		console.log("Register " + sensor);
		let metadata = databox.NewDataSourceMetadata();
		metadata.Description = 'Mobile phone ' + sensor + ' sensor';
		metadata.ContentType = 'text/csv';
		metadata.Vendor = 'Databox Inc.';
		metadata.Unit = '';
		metadata.DataSourceType = sensor;
		metadata.DataSourceID = sensor;
		metadata.StoreType = 'ts';
		tsc.RegisterDatasource(metadata)
		.catch((err)=>{
			console.log("Error registering sensor ", sensor);
		})
		sensors.push(sensor);
	}

	req
		.on('data', function (chunk) {
			buffer += chunk;
			if (!~buffer.indexOf('\n')) {
				return;
			}

			while (buffer.indexOf('\n') >= 0) {
				buffer = buffer.split('\n');
				let data = buffer.shift().split(',')
				console.log("Sending " + sensor + " data: " + data);
				tsc.Write(sensor, data)
					.catch((err) => console.log(err));

				buffer = buffer.join('\n');
			}
		})
		.on('end', function () {
			res.status(200);
			res.send("Success");
		});
});

//connect to the store
let tsc = databox.NewTimeSeriesBlobClient(DATABOX_ZMQ_ENDPOINT, false);

//start the http server
https.createServer(credentials, app).listen(PORT);
