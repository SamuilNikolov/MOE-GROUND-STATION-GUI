const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve index.html and CSS
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/shared.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'shared.css'));
});

// Function for random float and int
function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Simulated base coordinates
let baseLat = 29.210815;
let baseLon = -81.022835;

// Altitude simulation variables
let altitude = 0;
let ascending = true; // start by ascending
const ALT_STEP = 10; // increment altitude by 10m per second
const MAX_ALT = 1000; // max altitude

setInterval(() => {
    // Update altitude
    if (ascending) {
        altitude += ALT_STEP;
        if (altitude >= MAX_ALT) {
            altitude = MAX_ALT;
            ascending = false;
        }
    } else {
        altitude -= ALT_STEP;
        if (altitude <= 0) {
            altitude = 0;
            ascending = true; // start ascending again after hitting ground
        }
    }

    const latitude = baseLat + getRandomFloat(-0.001, 0.001);
    const longitude = baseLon + getRandomFloat(-0.001, 0.001);
    const velocity = getRandomInt(10, 50);   // km/h, just a random range
    const xAcc = getRandomFloat(-1, 1);      
    const yAcc = getRandomFloat(-1, 1);      
    const zAcc = getRandomFloat(-1, 1);      
    const temperature = getRandomInt(15, 35);
    const pitch = getRandomFloat(-45, 45);
    const yaw = getRandomFloat(-180, 180);
    const roll = getRandomFloat(-45, 45);

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
    console.log(`Simulated Data: Alt: ${altitude}, Ascending: ${ascending}`);
}, 1000); // 1 Hz updates

io.on('connection', (socket) => {
    console.log('Client connected (simulation)');
    socket.on('disconnect', () => {
        console.log('Client disconnected (simulation)');
    });
});

server.listen(3000, () => {
    console.log('Simulated Server running on http://localhost:3000');
});

