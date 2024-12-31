const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
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
// Adjust the serial port name and baudRate as needed
const port = new SerialPort({ path: 'COM12', baudRate: 115200 });

let tempBuffer = Buffer.alloc(0); // Temporary buffer for incoming data

// Create a unique CSV file name based on the start time
const startTime = new Date();
const timestampString = startTime.toISOString().replace(/[:.]/g, '-');
const csvFileName = `data_log_${timestampString}.csv`;
const csvFilePath = path.join(__dirname, csvFileName);

// Update headers to include temperature
const headers = [
    'Timestamp',
    'Latitude',
    'Longitude',
    'Velocity',
    'Altitude',
    'X_Acc(g)',
    'Y_Acc(g)',
    'Z_Acc(g)',
    'Temperature'
];
fs.writeFileSync(csvFilePath, headers.join(',') + '\n', 'utf8');

port.on('data', (data) => {
    // Append new data to the temporary buffer
    tempBuffer = Buffer.concat([tempBuffer, data]);

    // Now we expect packets of 21 bytes total: start + 19 payload + end
    // start byte: 0x7E (1 byte)
    // end byte:   0x7F (1 byte)
    // payload:    19 bytes
    // total:      21 bytes
    // Thus, endIndex - startIndex should be 20.
    while (tempBuffer.length >= 21) {
        const startIndex = tempBuffer.indexOf(0x7E); // Start byte
        const endIndex = tempBuffer.indexOf(0x7F, startIndex + 1); // End byte after start

        // Check if we found both markers and length is correct
        if (startIndex !== -1 && endIndex !== -1 && (endIndex - startIndex) === 20) {
            // Extract the packet payload (19 bytes)
            const packet = tempBuffer.slice(startIndex + 1, endIndex);
            // Remove processed bytes from buffer
            tempBuffer = tempBuffer.slice(endIndex + 1);

            try {
                // Decode the packet:
                // Payload layout (19 bytes):
                // 0-3: float latitude
                // 4-7: float longitude
                // 8-9: int16 velocity
                // 10-11: int16 altitude
                // 12-13: int16 xAcc (raw)
                // 14-15: int16 yAcc (raw)
                // 16-17: int16 zAcc (raw)
                // 18: uint8 temperature

                const latitude = packet.readFloatLE(0);    // bytes 0-3
                const longitude = packet.readFloatLE(4);   // bytes 4-7
                const velocity = packet.readInt16LE(8);    // bytes 8-9
                const altitude = packet.readInt16LE(10);   // bytes 10-11
                const xAcc = packet.readInt16LE(12) / 100 / 9.81;  // bytes 12-13 to g
                const yAcc = packet.readInt16LE(14) / 100 / 9.81;  // bytes 14-15 to g
                const zAcc = packet.readInt16LE(16) / 100 / 9.81;  // bytes 16-17 to g
                const temperature = packet.readUInt8(18);          // byte 18

                // Emit data to the front-end via Socket.IO
                io.emit('gpsData', {
                    lat: latitude,
                    lon: longitude,
                    velocity,
                    altitude,
                    xAcc,
                    yAcc,
                    zAcc,
                    temperature
                });

                // Log to console
                console.log(`Latitude: ${latitude}`);
                console.log(`Longitude: ${longitude}`);
                console.log(`Velocity: ${velocity}`);
                console.log(`Altitude: ${altitude}`);
                console.log(`X Acc: ${xAcc}`);
                console.log(`Y Acc: ${yAcc}`);
                console.log(`Z Acc: ${zAcc}`);
                console.log(`Temperature: ${temperature}`);
                console.log('----------------------------');

                // Append to CSV file
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
                    temperature
                ].join(',');

                fs.appendFile(csvFilePath, row + '\n', (err) => {
                    if (err) console.error('Error writing to CSV:', err);
                });

            } catch (err) {
                console.error('Error parsing packet:', err.message);
            }
        } else {
            // No valid packet found or invalid size. Discard until we find the next start marker.
            if (startIndex === -1) {
                // No start found, discard everything
                tempBuffer = Buffer.alloc(0);
            } else if (endIndex === -1) {
                // No end found yet, wait for more data
                break;
            } else {
                // Packet length mismatch, discard data up to endIndex and try again
                tempBuffer = tempBuffer.slice(endIndex + 1);
            }
        }
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
