const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique tracking token
 * @returns {string} A unique UUID tracking token
 */
const generateTrackingToken = () => {
    return uuidv4();
};

/**
 * Generate QR code as base64 data URL
 * @param {string} trackingToken - The unique tracking token
 * @returns {Promise<string>} Base64 encoded QR code image
 */
const generateTrackingQRCode = async (trackingToken) => {
    try {
        // Construct tracking URL - use backend URL since it serves the frontend
        const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 3000}`;
        const trackingUrl = `${frontendUrl}/src/pages/track-complaint.html?token=${trackingToken}`;
        
        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.95,
            margin: 1,
            color: {
                dark: '#124E66',  // Deep teal blue from theme
                light: '#FFFFFF'
            },
            width: 300
        });
        
        return qrDataUrl;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code');
    }
};

/**
 * Generate QR code as buffer for email attachment
 * @param {string} trackingToken - The unique tracking token
 * @returns {Promise<Buffer>} QR code as buffer
 */
const generateTrackingQRCodeBuffer = async (trackingToken) => {
    try {
        // Construct tracking URL - use backend URL since it serves the frontend
        const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 3000}`;
        const trackingUrl = `${frontendUrl}/src/pages/track-complaint.html?token=${trackingToken}`;
        
        // Generate QR code as buffer
        const qrBuffer = await QRCode.toBuffer(trackingUrl, {
            errorCorrectionLevel: 'H',
            type: 'png',
            margin: 1,
            color: {
                dark: '#124E66',  // Deep teal blue from theme
                light: '#FFFFFF'
            },
            width: 300
        });
        
        return qrBuffer;
    } catch (error) {
        console.error('Error generating QR code buffer:', error);
        throw new Error('Failed to generate QR code buffer');
    }
};

/**
 * Generate tracking QR code email template
 * @param {Object} complaintDetails - Details of the complaint
 * @param {boolean} useCid - Whether to use CID reference (true) or data URL (false)
 * @returns {string} HTML email template
 */
const generateTrackingEmailTemplate = (complaintDetails, useCid = true) => {
    const { complaintId, trackingToken, complaintType, location, createdAt, userName } = complaintDetails;
    const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const trackingUrl = `${frontendUrl}/src/pages/track-complaint.html?token=${trackingToken}`;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Roboto', Arial, sans-serif;
            line-height: 1.6;
            color: #212A31;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .header {
            background: linear-gradient(135deg, #124E66 0%, #2E3944 100%);
            color: #ffffff;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            color: #124E66;
            margin-bottom: 20px;
            font-weight: 500;
        }
        .message {
            color: #2E3944;
            margin-bottom: 25px;
            font-size: 14px;
        }
        .complaint-info {
            background: #f8f9fa;
            border-left: 4px solid #124E66;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .complaint-info p {
            margin: 8px 0;
            font-size: 14px;
        }
        .complaint-info strong {
            color: #124E66;
            display: inline-block;
            min-width: 140px;
        }
        .qr-section {
            text-align: center;
            margin: 30px 0;
            padding: 25px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .qr-section h2 {
            color: #124E66;
            font-size: 18px;
            margin-bottom: 15px;
        }
        .qr-code {
            display: inline-block;
            padding: 15px;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        .qr-code img {
            display: block;
            max-width: 250px;
            height: auto;
        }
        .instruction {
            margin-top: 15px;
            color: #748D92;
            font-size: 13px;
        }
        .tracking-link {
            text-align: center;
            margin: 25px 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background: #124E66;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 500;
            transition: background 0.3s ease;
        }
        .btn:hover {
            background: #2E3944;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #748D92;
            border-top: 1px solid #e0e0e0;
        }
        .footer p {
            margin: 5px 0;
        }
        .divider {
            height: 1px;
            background: #e0e0e0;
            margin: 25px 0;
        }
        .note {
            background: #fff9e6;
            border-left: 3px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
            font-size: 13px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ SecureVoice - Complaint Tracking</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello ${userName || 'User'},
            </div>
            
            <div class="message">
                <p>Thank you for submitting your complaint to SecureVoice. Your report has been successfully registered and is now being processed by our team.</p>
            </div>
            
            <div class="complaint-info">
                <p><strong>Complaint ID:</strong> #${complaintId}</p>
                <p><strong>Type:</strong> ${complaintType}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Submitted On:</strong> ${new Date(createdAt).toLocaleString('en-US', { 
                    dateStyle: 'medium', 
                    timeStyle: 'short' 
                })}</p>
                <p><strong>Current Status:</strong> <span style="color: #ffc107; font-weight: 600;">Pending</span></p>
            </div>
            
            <div class="qr-section">
                <h2>📱 Track Your Complaint</h2>
                <p style="color: #748D92; margin-bottom: 20px;">Scan this QR code to instantly track your complaint status</p>
                <div class="qr-code">
                    <img src="${useCid ? 'cid:complaint-qr' : qrCodeDataUrl}" alt="Complaint Tracking QR Code" style="max-width: 250px; height: auto; display: block; margin: 0 auto;" />
                </div>
                <p class="instruction">Use your phone's camera or any QR code scanner app</p>
            </div>
            
            <div class="divider"></div>
            
            <div class="tracking-link">
                <p style="color: #748D92; margin-bottom: 15px;">Or click the button below to track online:</p>
                <a href="${trackingUrl}" class="btn">Track Complaint Status</a>
            </div>
            
            <div class="note">
                <strong>📌 Note:</strong> You can track your complaint anytime without logging in. Simply scan the QR code or use the tracking link provided above. Keep this email for your records.
            </div>
        </div>
        
        <div class="footer">
            <p><strong>SecureVoice Crime Reporting System</strong></p>
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>For support, contact us through our website.</p>
            <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} SecureVoice. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = {
    generateTrackingToken,
    generateTrackingQRCode,
    generateTrackingQRCodeBuffer,
    generateTrackingEmailTemplate
};
