const mongoose = require('mongoose');
const redis = require('redis');

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    console.log('Please ensure MongoDB is running on:', process.env.MONGODB_URI);
    process.exit(1);
  }
};

// Redis connection
const connectRedis = async () => {
  try {
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000, // 5 second timeout
        lazyConnect: true
      }
    });
    
    client.on('error', (err) => {
      console.log('Redis Client Error:', err.message);
    });
    client.on('connect', () => console.log('Redis Connected'));
    client.on('ready', () => console.log('Redis Ready'));
    
    await client.connect();
    return client;
  } catch (error) {
    console.warn('Redis connection failed:', error.message);
    console.log('Continuing without Redis - some features may be limited');
    return null;
  }
};

module.exports = { connectDB, connectRedis };