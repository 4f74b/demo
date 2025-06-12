const express = require('express');
const http = require('http');
const https = require('https');
const url = require('url');

const app = express();
const PORT = 3000;

// Helper function to make HTTP/HTTPS requests
function makeRequest(address, callback) {
    // Normalize the address - add protocol if missing
    let fullUrl = address;
    if (!address.startsWith('http://') && !address.startsWith('https://')) {
        fullUrl = 'https://' + address;
    }

    const parsedUrl = new URL(fullUrl);
    const requestModule = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        timeout: 5000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
    };

    const req = requestModule.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            // Extract title from HTML
            const titleMatch = data.match(/<title[^>]*>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : 'NO RESPONSE';
            callback(null, { address, title });
        });
    });

    req.on('error', (error) => {
        callback(null, { address, title: 'NO RESPONSE' });
    });

    req.on('timeout', () => {
        req.destroy();
        callback(null, { address, title: 'NO RESPONSE' });
    });

    req.end();
}

// Helper function to process multiple addresses using callbacks
function fetchTitles(addresses, callback) {
    if (!addresses || addresses.length === 0) {
        return callback(null, []);
    }

    let results = [];
    let completed = 0;
    let hasError = false;

    addresses.forEach((address, index) => {
        makeRequest(address, (error, result) => {
            if (hasError) return;

            if (error) {
                hasError = true;
                return callback(error);
            }

            results[index] = result;
            completed++;

            // Check if all requests are complete
            if (completed === addresses.length) {
                callback(null, results);
            }
        });
    });
}

// Main route handler
app.get('/I/want/title', (req, res) => {
    let addresses = req.query.address;

    // Handle single address or array of addresses
    if (!addresses) {
        return res.status(400).send('<html><body><h1>Error: No addresses provided</h1></body></html>');
    }

    // create an array for addresses
    if (typeof addresses === 'string') {
        addresses = [addresses];
    }

    fetchTitles(addresses, (error, results) => {
        if (error) {
            return res.status(500).send('<html><body><h1>Internal Server Error</h1></body></html>');
        }

        // Generate HTML response
        let html = `<html>
                        <head>
                            <title>Extract Titles </title>
                        </head>
                        <body>

                            <h1> Following are the titles of given websites: </h1>

                            <ul>`;

                                results.forEach(result => {
                                    html += `
                            <li> ${result.address} - "${result.title}" </li>`;
                                });

                                html += `
                            </ul>
                        </body>
                    </html>`;

        res.send(html);
    });
});

// Handle 404 for all other routes
app.use((req, res) => {
    res.status(404).send('Not Found');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;