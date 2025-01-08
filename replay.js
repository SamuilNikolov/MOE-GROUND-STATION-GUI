const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parse');

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
                .pipe(csv.parse({ columns: true, cast: true }))
                .on('data', (row) => {
                    this.telemetryData.push({
                        timestamp: new Date(row.Timestamp),
                        lat: parseFloat(row.Latitude),
                        lon: parseFloat(row.Longitude),
                        velocity: parseFloat(row.Velocity),
                        altitude: parseFloat(row.Altitude),
                        xAcc: parseFloat(row['X_Acc(g)']),  // Updated field name
                        yAcc: parseFloat(row['Y_Acc(g)']),  // Updated field name
                        zAcc: parseFloat(row['Z_Acc(g)']),  // Updated field name
                        temperature: parseFloat(row.Temperature)
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

        console.log('Starting replay...');
        this.isPlaying = true;
        this.currentIndex = 0;
        this.emitNext();
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
        const timeDiff = nextData.timestamp - currentData.timestamp;
        const delayMs = timeDiff.valueOf();

        // Emit current data
        io.emit('gpsData', currentData);
        console.log(`Emitted data point ${this.currentIndex + 1}/${this.telemetryData.length}:`, 
                    `Alt: ${currentData.altitude}m, Vel: ${currentData.velocity}m/s`);

        // Schedule next emission
        this.currentIndex++;
        setTimeout(() => this.emitNext(), delayMs);
    }
}

// Create telemetry replay instance
const telemetryReplay = new TelemetryReplay('flight_data.csv');

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