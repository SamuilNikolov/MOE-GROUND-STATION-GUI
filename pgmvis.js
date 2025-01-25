/**
 * server.js
 *
 * A simple Node server that:
 *  - Reads "example.pgm" into memory, splits it by lines.
 *  - Serves each line on request ("/nextLine").
 *  - Serves a small HTML/JS client ("/").
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const pgmFile = path.join(__dirname, 'handsmat.ascii.pgm'); // <-- Make sure this file exists!

// Read the entire PGM file once at startup
let allLines = [];
fs.readFile(pgmFile, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading example.pgm:', err);
    process.exit(1);
  }
  // Split the file into lines
  allLines = data.split('\n');
});

let lineIndex = 0; // We'll serve lines in sequence

const server = http.createServer((req, res) => {
  if (req.url === '/nextLine') {
    // Return the next line of the PGM file, or "EOF" if we're out
    if (lineIndex < allLines.length) {
      res.end(allLines[lineIndex]);
      lineIndex++;
    } else {
      res.end('EOF'); // No more lines
    }
  } else if (req.url === '/') {
    // Serve our HTML/JS "client"
    fs.readFile(path.join(__dirname, 'pgmvisual.html'), 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading pgmvisual.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
