const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let linesCount = 0;
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

const port = new SerialPort({ path: 'COM12', baudRate: 115200 });

let tempBuffer = Buffer.alloc(0); // Temporary buffer for incoming data

// Create a unique CSV file name based on the start time
const startTime = new Date();
const timestampString = startTime.toISOString().replace(/[:.]/g, '-');
const csvFileName = `data_log_${timestampString}.csv`;
const csvFilePath = path.join(__dirname, csvFileName);

// Update headers to include packet timestamp
const headers = [
    'SystemTimestamp',
    'PacketTimestamp',
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

    // Now we expect packets of 24 bytes total: start + 22 payload + end
    // start byte: 0x7E (1 byte)
    // timestamp:  3 bytes
    // payload:    18 bytes
    // end byte:   0x7F (1 byte)
    // total:      24 bytes
    while (tempBuffer.length >= 24) {
        const startIndex = tempBuffer.indexOf(0x7E);
        const endIndex = tempBuffer.indexOf(0x7F, startIndex + 1);

        // Check if we found both markers and length is correct
        if (startIndex !== -1 && endIndex !== -1 && (endIndex - startIndex) === 23) {
            // Extract the packet payload (22 bytes)
            const packet = tempBuffer.slice(startIndex + 1, endIndex);
            // Remove processed bytes from buffer
            tempBuffer = tempBuffer.slice(endIndex + 1);

            try {
                // Reconstruct timestamp from 3 bytes
                const timestamp = (packet[0] << 16) | (packet[1] << 8) | packet[2];

                // Decode the rest of the packet:
                const latitude = packet.readFloatLE(3);    // bytes 3-6
                const longitude = packet.readFloatLE(7);   // bytes 7-10
                const velocity = packet.readInt16LE(11);   // bytes 11-12
                const altitude = packet.readInt16LE(13)-8;   // bytes 13-14
                const xAcc = packet.readInt16LE(15) / 100 / 9.81;  // bytes 15-16 to g
                const yAcc = packet.readInt16LE(17) / 100 / 9.81;  // bytes 17-18 to g
                const zAcc = packet.readInt16LE(19) / 100 / 9.81;  // bytes 19-20 to g
                const temperature = packet.readUInt8(21);          // byte 21

                // Emit data to the front-end via Socket.IO
                io.emit('gpsData', {
                    timestamp,
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
                console.log(`Packet Timestamp: ${timestamp} ms`);
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
                    timestamp,
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
                
                linesCount++;
                io.emit('logInfo', {
                    fileName: csvFileName,
                    lines: linesCount
                });
            } catch (err) {
                console.error('Error parsing packet:', err.message);
            }
        } else {
            // No valid packet found or invalid size
            if (startIndex === -1) {
                tempBuffer = Buffer.alloc(0);
            } else if (endIndex === -1) {
                break;
            } else {
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