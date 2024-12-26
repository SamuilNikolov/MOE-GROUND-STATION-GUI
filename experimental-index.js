/************************************************
 * Simulated Server with CSV Logging
 ************************************************/
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(__dirname));
// Serve index.html and CSS
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/globe', (req, res) => {
    res.sendFile(path.join(__dirname, 'cesium-globe.html'));
});
app.get('/shared.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'shared.css'));
});

/************************************************
 *   CSV Logging Setup
 ************************************************/
// Create a unique CSV file name based on the start time
const startTime = new Date();
const timestampString = startTime.toISOString().replace(/[:.]/g, '-');
const csvFileName = `data_log_${timestampString}.csv`;
const csvFilePath = path.join(__dirname, csvFileName);

// Keep track of how many lines have been written
let linesCount = 0;

// CSV headers (same as your real code plus pitch, yaw, roll if desired)
const headers = [
    'Timestamp',
    'Latitude',
    'Longitude',
    'Velocity',
    'Altitude',
    'X_Acc(g)',
    'Y_Acc(g)',
    'Z_Acc(g)',
    'Temperature',
    'Pitch',
    'Yaw',
    'Roll'
];

// Write headers to CSV
fs.writeFileSync(csvFilePath, headers.join(',') + '\n', 'utf8');
linesCount++; // counting the header line

/************************************************
 *   Random Data Simulation
 ************************************************/
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
const ALT_STEP = 20;  // increment altitude by 10m per second
const MAX_ALT = 3000; // max altitude

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
            ascending = true; 
        }
    }

    // Generate random telemetry
    const latitude = baseLat + getRandomFloat(-0.0001, 0.0001);
    const longitude = baseLon + getRandomFloat(-0.0001, 0.0001);
    const velocity = getRandomInt(10, 50);  
    const xAcc = getRandomFloat(-10, 10);
    const yAcc = getRandomFloat(-10, 10);
    const zAcc = getRandomFloat(-10, 10);
    const temperature = getRandomInt(15, 35);
    const pitch = getRandomFloat(-180, 180);
    const yaw   = getRandomFloat(-180, 180);
    const roll  = getRandomFloat(-180, 180);

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

    // Emit data to front-end
    io.emit('gpsData', data);

    // Log to console
    console.log(`Simulated Data: Alt:${altitude}, Ascending:${ascending}`);

    // Append new row to CSV
    const currentTime = new Date().toISOString();
    const row = [
        currentTime,
        latitude,
        longitude,
        velocity,
        altitude,
        xAcc,
        yAcc,
        zAcc,
        temperature,
        pitch,
        yaw,
        roll
    ].join(',');

    fs.appendFile(csvFilePath, row + '\n', (err) => {
        if (err) console.error('Error writing to CSV:', err);
    });
    linesCount++;

    // Optionally emit logging status to the front-end
    io.emit('logInfo', {
        fileName: csvFileName,
        lines: linesCount
    });
}, 200); // e.g., 5 Hz updates

/************************************************
 *   Socket.IO Connections
 ************************************************/
io.on('connection', (socket) => {
    console.log('Client connected (simulation)');

    // Send immediate logging info so the new client sees how many lines are in the CSV
    socket.emit('logInfo', {
        fileName: csvFileName,
        lines: linesCount
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected (simulation)');
    });
});

/************************************************
 *   Start Server
 ************************************************/
server.listen(3000, () => {
    console.log('Simulated Server running on http://localhost:3000');
});
