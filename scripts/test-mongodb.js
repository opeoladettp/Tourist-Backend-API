#!/usr/bin/env node

const mongoose = require('mongoose');

async function testMongoDB() {
  console.log('🔍 Testing MongoDB Connection...\n');
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tourlicity';
  console.log(`Connecting to: ${mongoUri}`);
  
  try {
    // Close any existing connections
    if (mongoose.connection.readyState !== 0) {
      console.log('Closing existing connection...');
      await mongoose.disconnect();
    }
    
    console.log('Attempting to connect...');
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5, // Smaller pool for testing
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Ready State: ${conn.connection.readyState}`);
    
    // Test a simple operation
    console.log('\n🧪 Testing database operations...');
    
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections`);
    
    if (collections.length > 0) {
      console.log('   Collections:', collections.map(c => c.name).join(', '));
    }
    
    // Test connection stats
    const stats = await conn.connection.db.stats();
    console.log(`✅ Database stats: ${stats.collections} collections, ${stats.objects} objects`);
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully - MongoDB is working!');
    
  } catch (error) {
    console.error('\n❌ MongoDB Connection Failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    
    if (error.reason) {
      console.error(`   Reason: ${error.reason.type}`);
      if (error.reason.servers) {
        const server = error.reason.servers.values().next().value;
        if (server) {
          console.error(`   Server Error: ${server.error?.message || 'Unknown'}`);
        }
      }
    }
    
    console.log('\n💡 Troubleshooting suggestions:');
    console.log('   1. Check if MongoDB service is running: net start | findstr MongoDB');
    console.log('   2. Restart MongoDB service: net stop MongoDB && net start MongoDB');
    console.log('   3. Check MongoDB logs for errors');
    console.log('   4. Verify MongoDB is listening on port 27017: netstat -an | findstr :27017');
    
    process.exit(1);
  }
}

// Load environment variables
require('dotenv').config();

// Run the test
testMongoDB();