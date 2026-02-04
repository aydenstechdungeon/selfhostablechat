#!/usr/bin/env node

/**
 * Simple health check script for Docker container
 * Checks if the application is responding on the configured port
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

const options = {
    host: HOST,
    port: PORT,
    path: '/health', // Using the dedicated health endpoint
    timeout: 2000
};

const request = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

request.on('error', (err) => {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
});

request.end();
