const express = require('express');
const http = require('http');
const https = require('https');

const app = express();
const PORT = 3000;

function makeRequest(address) {
    return new Promise((resolve, reject) => {
        let fullUrl = address;
        if (!address.startsWith('http://') && !address.startsWith('https://')) {
            fullUrl = 'https://' + address;
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(fullUrl);
        } catch (error) {
            return resolve({ address, title: 'NO RESPONSE' });
        }

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
                const titleMatch = data.match(/<title[^>]*>(.*?)<\/title>/i);
                const title = titleMatch ? titleMatch[1].trim() : 'NO RESPONSE';
                resolve({ address, title });
            });
        });

        req.on('error', () => {
            resolve({ address, title: 'NO RESPONSE' });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ address, title: 'NO RESPONSE' });
        });

        req.end();
    });
}

app.get('/I/want/title', (req, res) => {
    let addresses = req.query.address;

    if (!addresses) {
        return res.status(400).send('<html><body><h1>Error: No addresses provided</h1></body></html>');
    }

    if (typeof addresses === 'string') {
        addresses = [addresses];
    }

    Promise.all(addresses.map(address => makeRequest(address)))
        .then(results => {
            let html = `<html>
<head></head>
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
        })
        .catch(error => {
            res.status(500).send('<html><body><h1>Internal Server Error</h1></body></html>');
        });
});

app.use((req, res) => {
    res.status(404).send('Not Found');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;