const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const seedDatabase = require('./seed');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');

dotenv.config();

const app = express();

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin or any localhost / 127.0.0.1 origin
        if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // Fallback allow for development convenience
    },
    credentials: true,
}));

app.use(express.json());

const path = require('path');
const fs = require('fs');

// Health check route for uptime monitoring & Render keep-alive
app.get(['/api/health', '/health'], (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        message: 'Server is active and healthy'
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

// Serve static client assets if built, or present API root info
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.status(200).json({
            message: '🎉 Welcome to DreamEvents API Server',
            healthUrl: '/api/health',
            eventsUrl: '/api/events',
            status: 'online'
        });
    });
}

const setupKeepAlive = (port) => {
    const SEVEN_MINUTES = 7 * 60 * 1000;
    
    setInterval(async () => {
        try {
            // Render automatically sets RENDER_EXTERNAL_URL in production.
            // Falls back to SERVER_URL or localhost if defined.
            const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || `http://localhost:${port}`;
            const healthUrl = `${baseUrl.replace(/\/$/, '')}/api/health`;
            
            const response = await fetch(healthUrl);
            const data = await response.json();
            console.log(`[Keep-Alive ⏰] Pinged ${healthUrl} - Status: ${response.status} (${data.status})`);
        } catch (err) {
            console.warn(`[Keep-Alive ⚠️] Ping warning:`, err.message);
        }
    }, SEVEN_MINUTES);
};

const connectDB = async () => {
    try {
        if (process.env.MONGO_URI) {
            console.log('Connecting to primary MongoDB URI...');
            await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
            console.log('✅ Connected to Primary MongoDB');
            await seedDatabase();
            return;
        }
    } catch (err) {
        console.warn('⚠️  Primary MongoDB connection failed:', err.message);
        console.log('Falling back to In-Memory MongoDB Server...');
    }

    try {
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to In-Memory MongoDB Server at', mongoUri);
        await seedDatabase();
    } catch (memErr) {
        console.error('❌ Failed to start In-Memory MongoDB:', memErr);
    }
};

const startServer = async () => {
    await connectDB();
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
        console.log(`🚀 Server is running on port ${port}`);
        console.log(`💚 Health check active at http://localhost:${port}/api/health`);
        setupKeepAlive(port);
    });
};

startServer();