// Simple API test script
const http = require('http');

const testEndpoint = (method, path, body = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`\n${method} ${path}`);
                console.log(`Status: ${res.statusCode}`);
                try {
                    console.log('Response:', JSON.parse(data));
                } catch {
                    console.log('Response:', data);
                }
                resolve(data);
            });
        });

        req.on('error', (err) => {
            console.error(`Error: ${err.message}`);
            reject(err);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

async function runTests() {
    console.log('=== API Tests ===\n');
    
    // Test 1: Health check
    await testEndpoint('GET', '/api/health');
    
    // Test 2: Send OTP
    await testEndpoint('POST', '/api/auth/send-otp', { phone: '01712345678' });
}

runTests().catch(console.error);
