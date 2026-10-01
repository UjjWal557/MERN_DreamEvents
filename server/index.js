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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

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
    });
};

startServer();