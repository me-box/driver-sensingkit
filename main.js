const https = require('https');
const express = require('express');
const databox = require('node-databox');

const credentials = databox.getHttpsCredentials();
const PORT = process.env.port || '8080';
const store = process.env.DATABOX_STORE_ENDPOINT;
const app = express();

app.enable('trust proxy');
app.disable('x-powered-by');

app.use('/ui', express.static('www'));
app.set('views', './views');
app.set('view engine', 'pug');

app.get('/status', (req, res) => {
	res.send('active');
});

app.get('/ui', (req, res) => {
	res.render('index');
});

app.post('/ui/:sensor/data', (req, res) => {
	const sensor = req.params.sensor;
	console.log("Receiving " + sensor + " data");
	let buffer = '';

	req.on('data', function(chunk) {
		buffer += chunk;
		if (!~buffer.indexOf('\n')) {
			return;
		}

		while (buffer.indexOf('\n') >= 0) {
			buffer = buffer.split('\n');
			//console.error("Sending " + sensor + " data: " + buffer[0]);
			databox.timeseries.write(store, sensor, buffer.shift().split(','))
				.catch((err) => console.log(err));

			buffer = buffer.join('\n');
		}
	});

	req.on('end', function() {
		console.log("End of " + sensor + " data");
		res.status(200);
		res.send("Success");
	});
});

// NOTE: Technically we should check every time we make request, since the status could change,
//       but then we'd practically double network I/O.
databox.waitForStoreStatus(store, 'active', 10).then(() => {
	https.createServer(credentials, app).listen(PORT);
}).catch((err) => console.error(err));
