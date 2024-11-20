const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const port = new SerialPort({ path: 'COM12', baudRate: 9600 });
const parser = new ReadlineParser({ delimiter: '\r\n' });
port.pipe(parser);

parser.on('data', (line) => {
    console.log(`Received: ${line}`);

    // Match the pattern to extract latitude, longitude, and velocity
    const match = line.match(/Lat:(\d{2})(\d+\.\d+)([NS]),Lon:(\d{3})(\d+\.\d+)([EW]),Velocity:(\d+\.\d+)/);
    if (match) {
        // Convert latitude
        const latDegrees = parseFloat(match[1]);
        const latMinutes = parseFloat(match[2]);
        const latitude = (latDegrees + latMinutes / 60) * (match[3] === 'S' ? -1 : 1);

        // Convert longitude
        const lonDegrees = parseFloat(match[4]);
        const lonMinutes = parseFloat(match[5]);
        const longitude = (lonDegrees + lonMinutes / 60) * (match[6] === 'W' ? -1 : 1);
        console.log(longitude)
        // Parse velocity
        const velocity = parseFloat(match[7]);

        // Log and emit data to the frontend
        console.log(`Parsed GPS Data: Latitude = ${latitude}, Longitude = ${longitude}, Velocity = ${velocity} km/h`);
        io.emit('gpsData', { lat: latitude, lon: longitude, velocity: velocity });
    }
});

io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
