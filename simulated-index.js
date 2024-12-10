const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
// Get the current date and time in a formatted string
const getTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

// Generate a unique log file path
const logFilePath = path.join(__dirname, `data_${getTimestamp()}.csv`);
app.use(express.static(path.join(__dirname)));// Serve static files from the directory
// Ensure the log file exists and has a header
if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, 'Timestamp,Latitude,Longitude,Velocity,Altitude\n');
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/experimental-index.html');
});

// Simulate GPS data
function simulateGpsData() {
    return {
        lat: 29.210815 + (Math.random() - 0.5) * 0.01,
        lon: -81.022835 + (Math.random() - 0.5) * 0.01,
        velocity: Math.floor(Math.random() * 100),
        altitude: Math.floor(Math.random() * 500),
    };
}

// Continuously generate and log data
setInterval(() => {
    const gpsData = simulateGpsData();
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp},${gpsData.lat},${gpsData.lon},${gpsData.velocity},${gpsData.altitude}\n`;

    // Append data to the CSV file
    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) console.error('Error writing to file:', err);
    });

    // Broadcast data to connected clients
    io.emit('gpsData', gpsData);
    console.log(gpsData);
}, 200); // Generate data every 200ms

// Handle client connections
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start the server
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
