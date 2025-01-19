const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parse');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
let accurateGPSLat = 0;
let accurateGPSLon = 0;
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/globe', (req, res) => {
    res.sendFile(path.join(__dirname, 'cesium-globe.html'));
});

// Define flight stages with their timestamps and colors
const FLIGHT_STAGES = {
    PRELAUNCH: {
        start: new Date('2025-01-07T22:57:00.430Z'),
        end: new Date('2025-01-07T22:58:10.000Z'),
        color: '#808080'  // Gray
    },
    ASCENT: {
        start: new Date('2025-01-07T22:58:10.000Z'),
        end: new Date('2025-01-07T22:58:30.000Z'),
        color: '#FF0000'  // Red
    },
    APOGEE: {
        start: new Date('2025-01-07T22:58:30.000Z'),
        end: new Date('2025-01-07T22:59:00.000Z'),
        color: '#00FF00'  // Green
    },
    DESCENT: {
        start: new Date('2025-01-07T23:01:00.000Z'),
        end: new Date('2025-01-07T23:02:00.000Z'),
        color: '#0000FF'  // Blue
    }
};

function determineStage(timestamp) {
    const time = new Date(timestamp);
    for (const [stage, data] of Object.entries(FLIGHT_STAGES)) {
        if (time >= data.start && time < data.end) {
            return {
                stage: stage,
                color: data.color
            };
        }
    }
    return {
        stage: 'UNKNOWN',
        color: '#FFFFFF'  // White
    };
}

class TelemetryReplay {
    constructor(filePath) {
        this.filePath = filePath;
        this.telemetryData = [];
        this.currentIndex = 0;
        this.isPlaying = false;
    }

    async loadData() {
        return new Promise((resolve, reject) => {
            console.log('Loading data from:', this.filePath);
            fs.createReadStream(this.filePath)
                .pipe(csv.parse({ columns: true }))
                .on('data', (row) => {
                    if(row.Latitude != 0 && row.Longitude != 0){
                        accurateGPSLat = row.Latitude;
                        accurateGPSLon = row.Longitude;
                    }
                    // Determine stage for this data point
                    const stageInfo = determineStage(row.Timestamp);
                    this.telemetryData.push({
                        timestamp: parseFloat(row.Timestamp),
                        lat: parseFloat(accurateGPSLat),
                        lon: parseFloat(accurateGPSLon),
                        velocity: parseFloat(row.Velocity),
                        altitude: parseFloat(row.Altitude)-8,
                        xAcc: parseFloat(row.AccelX)/1000,
                        yAcc: parseFloat(row.AccelY)/1000,
                        zAcc: parseFloat(row.AccelZ)/1000,
                        temperature: parseFloat(row.Temperature),
                        stage: stageInfo.stage,
                        stageColor: stageInfo.color
                    });
                })
                .on('end', () => {
                    console.log(`Loaded ${this.telemetryData.length} records`);
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error loading CSV:', error);
                    reject(error);
                });
        });
    }

    start() {
        if (this.telemetryData.length === 0) {
            console.error('No data loaded');
            return;
        }

        console.log('Starting replay in 7 seconds...');
        io.emit('countdown', { message: 'Simulation starting in 7 seconds...' });
        
        // Add 7-second delay before starting
        setTimeout(() => {
            this.isPlaying = true;
            this.currentIndex = 0;
            console.log('Starting replay now...');
            io.emit('countdown', { message: 'Simulation starting now!' });
            this.emitNext();
        }, 7000);
    }

    stop() {
        console.log('Stopping replay...');
        this.isPlaying = false;
    }

    emitNext() {
        if (!this.isPlaying || this.currentIndex >= this.telemetryData.length) {
            console.log('Replay complete');
            this.isPlaying = false;
            return;
        }

        const currentData = this.telemetryData[this.currentIndex];
        const nextData = this.telemetryData[this.currentIndex + 1];

        if (!nextData) {
            console.log('Replay complete - no more data');
            this.isPlaying = false;
            return;
        }

        // Calculate delay until next emission
        const timeDiff = (nextData.timestamp - currentData.timestamp);
        const delayMs = timeDiff.valueOf();
        console.log(nextData.altitude);
        // Emit current data
        io.emit('gpsData', currentData);
        console.log(`Emitted data point ${this.currentIndex + 1}/${this.telemetryData.length}:`, 
                    `Stage: ${currentData.stage}, Alt: ${currentData.altitude}m`);

        // Schedule next emission
        this.currentIndex++;
        setTimeout(() => this.emitNext(), delayMs);
    }
}

// Create telemetry replay instance
const telemetryReplay = new TelemetryReplay('flight-only.csv');

// Initialize data loading and replay on server start
(async () => {
    try {
        await telemetryReplay.loadData();
        console.log('Data loaded successfully, ready for connections');
    } catch (error) {
        console.error('Failed to load telemetry data:', error);
    }
})();

io.on('connection', async (socket) => {
    console.log('Client connected');
    
    // Send flight stages configuration to client
    socket.emit('flightStages', FLIGHT_STAGES);
    
    // Start replay automatically when client connects
    if (!telemetryReplay.isPlaying) {
        console.log('Starting replay for new client');
        telemetryReplay.start();
    }

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Telemetry replay server running on http://localhost:${PORT}`);
});