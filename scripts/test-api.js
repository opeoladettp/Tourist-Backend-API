#!/usr/bin/env node

const http = require('http');

// Simple HTTP request function
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.end();
  });
}

// Test endpoints
async function testAPI() {
  const baseURL = 'http://localhost:5000';
  
  console.log('🧪 Testing Tourlicity Backend API...\n');
  
  // Test health check
  try {
    console.log('1. Testing Health Check...');
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/health',
      method: 'GET'
    });
    
    if (healthResponse.statusCode === 200) {
      console.log('✅ Health check passed');
      const healthData = JSON.parse(healthResponse.body);
      console.log(`   Status: ${healthData.status}`);
      console.log(`   Database: ${healthData.services?.database || 'unknown'}`);
      console.log(`   Redis: ${healthData.services?.redis || 'unknown'}`);
    } else {
      console.log(`❌ Health check failed (${healthResponse.statusCode})`);
    }
  } catch (error) {
    console.log(`❌ Health check error: ${error.message}`);
  }
  
  console.log('');
  
  // Test API documentation
  try {
    console.log('2. Testing API Documentation...');
    const docsResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api-docs',
      method: 'GET'
    });
    
    if (docsResponse.statusCode === 200) {
      console.log('✅ API documentation accessible');
    } else {
      console.log(`❌ API documentation failed (${docsResponse.statusCode})`);
    }
  } catch (error) {
    console.log(`❌ API documentation error: ${error.message}`);
  }
  
  console.log('');
  
  // Test file upload endpoints (should require auth)
  try {
    console.log('3. Testing Upload Endpoints (should require auth)...');
    const uploadResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/uploads/profile-picture',
      method: 'POST'
    });
    
    if (uploadResponse.statusCode === 401) {
      console.log('✅ Upload endpoint properly requires authentication');
    } else {
      console.log(`⚠️  Upload endpoint returned unexpected status: ${uploadResponse.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Upload endpoint error: ${error.message}`);
  }
  
  console.log('');
  
  // Test Google OAuth endpoint
  try {
    console.log('4. Testing Google OAuth Endpoint...');
    const authResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/google',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (authResponse.statusCode === 400) {
      console.log('✅ Google OAuth endpoint accessible (validation working)');
    } else {
      console.log(`⚠️  Google OAuth returned unexpected status: ${authResponse.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Google OAuth error: ${error.message}`);
  }
  
  console.log('');
  
  // Test Default Activities endpoint
  try {
    console.log('5. Testing Default Activities Endpoint (should require auth)...');
    const activitiesResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/activities',
      method: 'GET'
    });
    
    if (activitiesResponse.statusCode === 401) {
      console.log('✅ Activities endpoint properly requires authentication');
    } else {
      console.log(`⚠️  Activities endpoint returned unexpected status: ${activitiesResponse.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Activities endpoint error: ${error.message}`);
  }
  
  console.log('\n🎉 API test completed!');
  console.log('\n📋 Available endpoints:');
  console.log('   • Health: http://localhost:5000/health');
  console.log('   • API Docs: http://localhost:5000/api-docs');
  console.log('   • Auth: http://localhost:5000/api/auth/*');
  console.log('   • Uploads: http://localhost:5000/api/uploads/*');
  console.log('   • Tours: http://localhost:5000/api/custom-tours/*');
  console.log('   • Calendar: http://localhost:5000/api/calendar/*');
  console.log('   • Activities: http://localhost:5000/api/activities/*');
}

// Run the test
testAPI().catch(console.error);