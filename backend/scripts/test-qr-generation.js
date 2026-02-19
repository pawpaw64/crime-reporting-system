// Test QR Code Generation
const QRCode = require('qrcode');
const fs = require('fs');

async function testQRCodeGeneration() {
    console.log('🧪 Testing QR Code Generation...\n');
    
    const testToken = '6f5c9919-1b51-4e45-aa07-97082ea1244d';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    const trackingUrl = `${frontendUrl}/src/pages/track-complaint.html?token=${testToken}`;
    
    console.log('📍 Tracking URL:', trackingUrl);
    console.log('');
    
    try {
        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.95,
            margin: 1,
            color: {
                dark: '#124E66',
                light: '#FFFFFF'
            },
            width: 300
        });
        
        console.log('✅ QR Code generated successfully!');
        console.log('📏 Data URL length:', qrDataUrl.length, 'characters');
        console.log('📝 First 100 chars:', qrDataUrl.substring(0, 100) + '...');
        console.log('');
        
        // Also save as PNG file for testing
        const qrBuffer = await QRCode.toBuffer(trackingUrl, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.95,
            margin: 1,
            color: {
                dark: '#124E66',
                light: '#FFFFFF'
            },
            width: 300
        });
        
        const outputPath = './test-qr-code.png';
        fs.writeFileSync(outputPath, qrBuffer);
        console.log('💾 QR code saved to:', outputPath);
        console.log('📱 You can scan this file with your phone to test!');
        console.log('');
        
        // Create test HTML with embedded QR
        const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>QR Code Test</title>
    <style>
        body { font-family: Arial; padding: 40px; text-align: center; }
        .qr-container { background: white; padding: 20px; display: inline-block; border: 2px solid #124E66; }
        img { max-width: 300px; }
        .info { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
    </style>
</head>
<body>
    <h1>🧪 QR Code Generation Test</h1>
    <div class="qr-container">
        <h2>QR Code (Inline Data URL)</h2>
        <img src="${qrDataUrl}" alt="Test QR Code" />
    </div>
    <div class="info">
        <h3>Test Details</h3>
        <p><strong>Token:</strong> ${testToken}</p>
        <p><strong>Tracking URL:</strong><br>${trackingUrl}</p>
        <p><strong>Data URL Length:</strong> ${qrDataUrl.length} chars</p>
    </div>
    <div class="info">
        <h3>Instructions</h3>
        <p>1. Scan the QR code above with your phone</p>
        <p>2. It should open: <a href="${trackingUrl}" target="_blank">${trackingUrl}</a></p>
        <p>3. If the QR shows here but not in email, it's an email client issue</p>
    </div>
</body>
</html>`;
        
        fs.writeFileSync('./test-qr-inline.html', testHtml);
        console.log('📄 Test HTML created: test-qr-inline.html');
        console.log('🌐 Open this file in your browser to test inline QR code');
        console.log('');
        
        console.log('✅ All tests passed!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Open test-qr-inline.html in your browser');
        console.log('2. If QR code shows there, the generation works fine');
        console.log('3. If it shows in browser but not in email, it\'s an email client issue');
        console.log('4. Use the direct tracking link from the email instead');
        
    } catch (error) {
        console.error('❌ QR Code generation failed!');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testQRCodeGeneration();
