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

const port = new SerialPort({ path: 'COM5', baudRate: 115200 });

let tempBuffer = Buffer.alloc(0); // Temporary buffer for incoming data

// Create a unique CSV file name based on the start time
const startTime = new Date();
const timestampString = startTime.toISOString().replace(/[:.]/g, '-');
const csvFileName = `data_log_${timestampString}.csv`;
const csvFilePath = path.join(__dirname, csvFileName);

// Update CSV headers to include RSSI and SNR
const headers = [
    'SystemTimestamp',
    'Timestamp',
    'Latitude',
    'Longitude',
    'Velocity',
    'Altitude',
    'xAcc',
    'yAcc',
    'zAcc',
    'Temperature',
    'RSSI',
    'SNR'
];
fs.writeFileSync(csvFilePath, headers.join(',') + '\n', 'utf8');

port.on('data', (data) => {
    // Append new data to the temporary buffer
    tempBuffer = Buffer.concat([tempBuffer, data]);

    // Now we expect packets of 28 bytes total:
    //   Start byte: 0x7E (1 byte)
    //   Payload:    22 original payload bytes + 4 extra bytes (RSSI and SNR as 16-bit values) = 26 bytes
    //   End byte:   0x7F (1 byte)
    // Total:       28 bytes
    while (tempBuffer.length >= 28) {
        const startIndex = tempBuffer.indexOf(0x7E);
        const endIndex = tempBuffer.indexOf(0x7F, startIndex + 1);

        // Check if both markers exist and the length is correct:
        // (endIndex - startIndex) === 27 means 28 total bytes.
        if (startIndex !== -1 && endIndex !== -1 && (endIndex - startIndex) === 27) {
            // Extract the packet payload (bytes between start and end):
            // This will be 26 bytes:
            //   Bytes 0-21: original payload
            //   Bytes 22-23: RSSI (16-bit)
            //   Bytes 24-25: SNR (16-bit)
            const packet = tempBuffer.slice(startIndex + 1, endIndex);
            // Remove processed bytes from the buffer.
            tempBuffer = tempBuffer.slice(endIndex + 1);

            try {
                // Reconstruct timestamp from the first 3 bytes.
                const timestamp = (packet[0] << 16) | (packet[1] << 8) | packet[2];

                // Decode the original payload:
                const latitude = packet.readFloatLE(3);         // bytes 3-6
                const longitude = packet.readFloatLE(7);          // bytes 7-10
                const velocity = packet.readInt16LE(11);          // bytes 11-12
                const altitude = packet.readInt16LE(13) - 8;        // bytes 13-14, with offset -8
                const xAcc = packet.readInt16LE(15) / 100 / 9.81;   // bytes 15-16, convert to g
                const yAcc = packet.readInt16LE(17) / 100 / 9.81;   // bytes 17-18, convert to g
                const zAcc = packet.readInt16LE(19) / 100 / 9.81;   // bytes 19-20, convert to g
                const temperature = packet.readUInt8(21);           // byte 21

                // Decode the extra values for RSSI and SNR from the packet:
                const rssi = packet.readInt16LE(22);  // bytes 22-23
                const snr = packet.readInt16LE(24);   // bytes 24-25

                // Emit the complete data via Socket.IO
                io.emit('gpsData', {
                    timestamp,
                    lat: latitude,
                    lon: longitude,
                    velocity,
                    altitude,
                    xAcc,
                    yAcc,
                    zAcc,
                    temperature,
                    rssi,
                    snr
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
                console.log(`RSSI: ${rssi}`);
                console.log(`SNR: ${snr}`);
                console.log('----------------------------');

                // Append to CSV file with the new columns
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
                    temperature,
                    rssi,
                    snr
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
            // If no valid packet is found:
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
