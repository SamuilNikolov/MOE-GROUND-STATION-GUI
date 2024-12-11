const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the simulated index.html and CSS
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/shared.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'shared.css'));
});

// Instead of reading from a serial port, we simulate data:
function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Simulated base coordinates
let baseLat = 29.210815;
let baseLon = -81.022835;

// Simulate data generation at 1 Hz
setInterval(() => {
    // Create simulated data
    const latitude = baseLat + getRandomFloat(-0.01, 0.01);
    const longitude = baseLon + getRandomFloat(-0.01, 0.01);
    const velocity = getRandomInt(0, 100);     // km/h
    const altitude = getRandomInt(0, 20);      // meters
    const xAcc = getRandomFloat(-1, 1);        // g units
    const yAcc = getRandomFloat(-1, 1);        // g units
    const zAcc = getRandomFloat(-1, 1);        // g units
    const temperature = getRandomInt(15, 35);  // Celsius
    const pitch = getRandomFloat(-45, 45);     // degrees
    const yaw = getRandomFloat(-180, 180);     // degrees
    const roll = getRandomFloat(-45, 45);      // degrees

    const data = {
        lat: latitude,
        lon: longitude,
        velocity,
        altitude,
        xAcc,
        yAcc,
        zAcc,
        temperature,
        pitch,
        yaw,
        roll
    };

    io.emit('gpsData', data);
    console.log(`Simulated Data: Lat: ${latitude}, Lon: ${longitude}, Vel: ${velocity}, Alt: ${altitude}, X: ${xAcc}, Y: ${yAcc}, Z: ${zAcc}, Temp: ${temperature}, Pitch: ${pitch}, Yaw: ${yaw}, Roll: ${roll}`);
}, 100);

io.on('connection', (socket) => {
    console.log('Client connected (simulation)');
    socket.on('disconnect', () => {
        console.log('Client disconnected (simulation)');
    });
});

server.listen(3000, () => {
    console.log('Simulated Server running on http://localhost:3000');
});
