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

// Express setup
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/globe', (req, res) => {
    res.sendFile(path.join(__dirname, 'cesium-globe.html'));
});
app.get('/shared.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(__dirname + '/shared.css');
}); 
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'cesium-vis.html'));
});
// Flight stages definition with millisecond timestamps
const FLIGHT_STAGES = {
    PRELAUNCH: {
        start: 0, // 2025-01-07T22:57:00.430Z in milliseconds
        end: 1241127,   // 2025-01-07T22:58:10.000Z in milliseconds
        color: '#ffffff'
    },
    ASCENT_BURN: {
        start: 1241128, // 2025-01-07T22:58:10.000Z in milliseconds
        end: 1244828,   // 2025-01-07T22:58:30.000Z in milliseconds
        color: '#ff0000'
    },
    ASCENT_COAST: {
        start: 1244829, // 2025-01-07T22:58:10.000Z in milliseconds
        end: 1260278,   // 2025-01-07T22:58:30.000Z in milliseconds
        color: '#009dff'
    },
    APOGEE: {
        start: 1260279, // 2025-01-07T22:58:30.000Z in milliseconds
        end: 1262983,   // 2025-01-07T22:59:00.000Z in milliseconds
        color: '#62fc03'
    },
    DESCENT_DROGUE: {
        start: 1262984, // 2025-01-07T23:01:00.000Z in milliseconds
        end: 1358240,   // 2025-01-07T23:02:00.000Z in milliseconds
        color: '#ff8400'
    },
    DESCENT_MAIN: {
        start: 1358241, // 2025-01-07T23:01:00.000Z in milliseconds
        end: 999999999999,   // 2025-01-07T23:02:00.000Z in milliseconds
        color: '#ff00bf'
    }
};

function determineStage(timestamp) {
    // Convert timestamp to number if it's not already
    const time = Number(timestamp);
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
        color: '#FFFFFF'
    };
}

class TelemetryReplay {
    constructor(filePath) {
        this.filePath = filePath;
        this.telemetryData = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.replayStartTime = null;
        this.firstDataTimestamp = null;
    }

    async loadData() {
        return new Promise((resolve, reject) => {
            console.log('Loading data from:', this.filePath);
            fs.createReadStream(this.filePath)
                .pipe(csv.parse({ columns: true }))
                .on('data', (row) => {
                    if(row.Latitude != 0 && row.Longitude != 0) {
                        accurateGPSLat = row.Latitude;
                        accurateGPSLon = row.Longitude;
                    }
                    const stageInfo = determineStage(row.Timestamp);
                    this.telemetryData.push({
                        timestamp: Number(row.Timestamp), // Ensure timestamp is a number
                        lat: parseFloat(accurateGPSLat),
                        lon: parseFloat(accurateGPSLon),
                        velocity: parseFloat(row.Velocity),
                        altitude: parseFloat(row.Altitude),
                        xAcc: parseFloat(row.xAcc),
                        yAcc: parseFloat(row.yAcc),
                        zAcc: parseFloat(row.zAcc),
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
        
        setTimeout(() => {
            this.isPlaying = true;
            this.currentIndex = 0;
            this.replayStartTime = Date.now();
            this.firstDataTimestamp = this.telemetryData[0].timestamp;
            console.log('Starting replay now...');
            io.emit('countdown', { message: 'Simulation starting now!' });
            this.emitNext();
        }, 4000);
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

        // Calculate the elapsed time since replay started
        const elapsedTime = Date.now() - this.replayStartTime;
        // Calculate when the next data point should be emitted based on the original timestamps
        const nextDataTime = nextData.timestamp - this.firstDataTimestamp;
        console.log(nextDataTime)

        // Calculate delay accounting for processing time
        const delayMs = Math.max(0, nextDataTime - elapsedTime);

        // Emit current data
        io.emit('gpsData', currentData);
        console.log(`Emitted data point ${this.currentIndex + 1}/${this.telemetryData.length}:`, 
                    `Stage: ${currentData.stage}, Alt: ${currentData.altitude}m`);

        // Schedule next emission
        this.currentIndex++;
        console.log(delayMs);
        setTimeout(() => this.emitNext(), delayMs);
    }
}

// Initialize server
const telemetryReplay = new TelemetryReplay('flight2-omni-range-synced.csv');

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
    socket.emit('flightStages', FLIGHT_STAGES);
    
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