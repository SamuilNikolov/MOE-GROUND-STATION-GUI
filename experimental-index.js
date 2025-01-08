const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(__dirname));

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
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});
// CSV Setup
const startTime = new Date();
const timestampString = startTime.toISOString().replace(/[:.]/g, '-');
const csvFileName = `data_log_${timestampString}.csv`;
const csvFilePath = path.join(__dirname, csvFileName);
let linesCount = 0;

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

fs.writeFileSync(csvFilePath, headers.join(',') + '\n', 'utf8');
linesCount++;

// Flight dynamics simulation class
class RocketSimulation {
    constructor(launchLat, launchLon) {
        // Initial conditions
        this.launchLat = launchLat;
        this.launchLon = launchLon;
        this.altitude = 0;
        this.velocity = 0;
        this.verticalVelocity = 0;
        this.horizontalVelocity = 0;
        this.pitch = 90;  // Start vertical
        this.yaw = 45;    // Launch heading (degrees from north)
        this.roll = 0;
        this.time = -5;  // Start at T-10 seconds
        this.stage = 'countdown';  // New countdown stage
        
        // Flight parameters
        this.countdownTime = 3;  // 10 second countdown
        this.maxAltitude = 3000;  // meters
        this.maxVelocity = 300;   // m/s
        this.burnTime = 15;       // seconds
        this.gravity = 9.81;      // m/s²
        this.deltaTime = 0.2;     // 200ms update interval
        
        // Position tracking
        this.distance = 0;        // Ground distance traveled
        this.lat = launchLat;
        this.lon = launchLon;
    }

    update() {
        this.time += this.deltaTime;
        
        switch(this.stage) {
            case 'countdown':
                return this.updateCountdown();
            case 'boost':
                return this.updateBoostPhase();
            case 'coast':
                return this.updateCoastPhase();
            case 'descent':
                return this.updateDescentPhase();
        }
    }

    updateCountdown() {
        // Transition to boost phase when countdown ends
        if (this.time >= 0) {
            this.stage = 'boost';
            return this.updateBoostPhase();
        }

        // During countdown, return zero acceleration
        return {
            acceleration: 0,
            xAcc: 0,
            yAcc: 0,
            zAcc: 0
        };
    }

    updateBoostPhase() {
        if (this.time >= this.burnTime) {
            this.stage = 'coast';
            return this.updateCoastPhase();
        }

        // Gradually pitch over (gravity turn)
        if (this.altitude > 100) {
            this.pitch = Math.max(45, 90 - (this.time * 2));
        }

        // Acceleration profile (simplified)
        const acceleration = 30 * (1 - (this.time / this.burnTime)); // Decreasing acceleration
        this.velocity += acceleration * this.deltaTime;
        
        // Update position
        this.updatePosition();
        
        return {
            acceleration,
            xAcc: Math.sin(this.yaw * Math.PI / 180) * acceleration / this.gravity,
            yAcc: Math.cos(this.yaw * Math.PI / 180) * acceleration / this.gravity,
            zAcc: Math.sin(this.pitch * Math.PI / 180) * acceleration / this.gravity
        };
    }

    updateCoastPhase() {
        if (this.velocity <= 0 || this.altitude >= this.maxAltitude) {
            this.stage = 'descent';
            this.pitch = -90;  // Point straight down for descent
            return this.updateDescentPhase();
        }

        // Deceleration due to gravity and drag
        const deceleration = -this.gravity * Math.sin(this.pitch * Math.PI / 180);
        this.velocity += deceleration * this.deltaTime;
        
        // Update position
        this.updatePosition();
        
        return {
            acceleration: deceleration,
            xAcc: Math.sin(this.yaw * Math.PI / 180) * deceleration / this.gravity,
            yAcc: Math.cos(this.yaw * Math.PI / 180) * deceleration / this.gravity,
            zAcc: Math.sin(this.pitch * Math.PI / 180) * deceleration / this.gravity
        };
    }

    updateDescentPhase() {
        if (this.altitude <= 0) {
            this.altitude = 0;
            this.velocity = 0;
            this.verticalVelocity = 0;
            this.horizontalVelocity = 0;
            return {
                acceleration: 0,
                xAcc: 0,
                yAcc: 0,
                zAcc: 0
            };
        }

        // Calculate descent velocity (negative because going down)
        const terminalVelocity = -50;  // m/s
        this.verticalVelocity = Math.max(terminalVelocity, -Math.sqrt(2 * this.gravity * this.altitude));
        this.horizontalVelocity *= 0.99; // Gradual horizontal velocity decay
        this.velocity = Math.sqrt(this.verticalVelocity * this.verticalVelocity + 
                                this.horizontalVelocity * this.horizontalVelocity);
        
        // Update altitude directly using vertical velocity
        this.altitude += this.verticalVelocity * this.deltaTime;
        this.altitude = Math.max(0, this.altitude);
        
        // Update horizontal position
        const distance = this.horizontalVelocity * this.deltaTime;
        const bearing = this.yaw * Math.PI / 180;
        const R = 6371000; // Earth radius in meters
        
        this.lat -= (distance * Math.cos(bearing)) / R * (180 / Math.PI);
        this.lon -= (distance * Math.sin(bearing)) / (R * Math.cos(this.lat * Math.PI / 180)) * (180 / Math.PI);
        
        return {
            acceleration: -this.gravity,
            xAcc: 0,
            yAcc: 0,
            zAcc: -1
        };
    }

    updatePosition() {
        // Update velocities
        this.verticalVelocity = this.velocity * Math.sin(this.pitch * Math.PI / 180);
        this.horizontalVelocity = this.velocity * Math.cos(this.pitch * Math.PI / 180);
        
        // Update altitude based on vertical velocity
        this.altitude += this.verticalVelocity * this.deltaTime;
        this.altitude = Math.max(0, this.altitude);

        // Update horizontal position (simplified great circle calculation)
        const distance = this.horizontalVelocity * this.deltaTime;
        const bearing = this.yaw * Math.PI / 180;
        
        // Update lat/lon (simplified)
        const R = 6371000; // Earth radius in meters
        this.distance += distance;
        
        this.lat -= (distance * Math.cos(bearing)) / R * (180 / Math.PI);
        this.lon -= (distance * Math.sin(bearing)) / (R * Math.cos(this.lat * Math.PI / 180)) * (180 / Math.PI);

        // Add some realistic variation to roll
        this.roll += (Math.random() - 0.5) * 5;
        this.roll = Math.max(-180, Math.min(180, this.roll));
    }

    getData() {
        const acceleration = this.update();
        const temperature = 20 - (this.altitude / 100); // Rough temperature model

        return {
            lat: this.lat,
            lon: this.lon,
            velocity: Math.abs(this.velocity),
            altitude: this.altitude,
            xAcc: acceleration.xAcc,
            yAcc: acceleration.yAcc,
            zAcc: acceleration.zAcc,
            temperature
        };
    }
}

// Initialize simulation with launch coordinates
const simulation = new RocketSimulation(29.210815, -81.022835);
const START_TIME = Date.now(); // Store simulation start time

// Update loop
setInterval(() => {
    const data = simulation.getData();
    
    // Emit data to front-end
    io.emit('gpsData', data);

    // Log to console
    const countdownStr = data.countdown ? `T-${data.countdown}` : `T+${Math.floor(simulation.time)}`;
    console.log(`${countdownStr} - Alt:${data.altitude.toFixed(1)}m, Vel:${data.velocity.toFixed(1)}m/s, Stage:${simulation.stage}`);

    // Append new row to CSV
    const elapsedTime = Date.now() - START_TIME;
    const row = [
        elapsedTime,  // This will now start from 0 and increment
        data.lat,
        data.lon,
        data.velocity,
        data.altitude,
        data.xAcc,
        data.yAcc,
        data.zAcc,
        data.temperature,
        data.pitch,
        data.yaw,
        data.roll
    ].join(',');

    fs.appendFile(csvFilePath, row + '\n', (err) => {
        if (err) console.error('Error writing to CSV:', err);
    });
    linesCount++;

    io.emit('logInfo', {
        fileName: csvFileName,
        lines: linesCount
    });
}, 200);

io.on('connection', (socket) => {
    console.log('Client connected (simulation)');
    
    socket.emit('logInfo', {
        fileName: csvFileName,
        lines: linesCount
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected (simulation)');
    });
});

server.listen(3000, () => {
    console.log('Simulated Server running on http://localhost:3000');
});