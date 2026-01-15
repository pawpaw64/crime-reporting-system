const session = require('express-session');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');

// Helmet security configuration
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://cdn.tailwindcss.com",
                "https://cdnjs.cloudflare.com",
                "https://unpkg.com",
                "https://cdn.jsdelivr.net"
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com",
                "https://unpkg.com",
                "https://cdn.jsdelivr.net"
            ],
            fontSrc: [
                "'self'",
                "https://cdnjs.cloudflare.com",
                "https://fonts.gstatic.com"
            ],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: [
                "'self'", 
                "https://api.opencagedata.com", 
                "https://nominatim.openstreetmap.org",
                "https://*.tile.openstreetmap.org",
                "https://tile.openstreetmap.org",
                "https://a.tile.openstreetmap.org",
                "https://b.tile.openstreetmap.org",
                "https://c.tile.openstreetmap.org"
            ]
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    process.env.FRONTEND_URL
].filter(Boolean);

const corsConfig = cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
        return callback(null, true);
    },
    credentials: true
});

// Session configuration
const sessionConfig = session({
    secret: process.env.SESSION_SECRET || 'securevoice_crime_reporting_secret_key_2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
});

// Body parser configurations
const jsonParser = bodyParser.json({ limit: '10mb' });
const urlencodedParser = bodyParser.urlencoded({ extended: true, limit: '10mb' });

module.exports = {
    helmetConfig,
    corsConfig,
    sessionConfig,
    jsonParser,
    urlencodedParser
};
