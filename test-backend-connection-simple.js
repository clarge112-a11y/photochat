#!/usr/bin/env node

// Simple test script to check if backend is running
const http = require('http');

console.log('🔍 Testing backend connection...');

const testUrl = 'http://localhost:3003';

// Test basic health endpoint
const testHealth = () => {
  return new Promise((resolve, reject) => {
    const req = http.get(`${testUrl}/`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('✅ Backend health check passed:', parsed);
          resolve(parsed);
        } catch (e) {
          console.log('❌ Backend returned non-JSON response:', data);
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Backend health check failed:', error.message);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

// Test tRPC endpoint
const testTRPC = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      "0": {
        "json": null,
        "meta": {
          "values": ["undefined"]
        }
      }
    });

    const options = {
      hostname: 'localhost',
      port: 3003,
      path: '/api/trpc/health',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'trpc-accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('✅ tRPC health check passed:', parsed);
          resolve(parsed);
        } catch (e) {
          console.log('❌ tRPC returned non-JSON response:', data);
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ tRPC health check failed:', error.message);
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
};

// Run tests
async function runTests() {
  try {
    console.log('\n1. Testing basic backend health...');
    await testHealth();
    
    console.log('\n2. Testing tRPC endpoint...');
    await testTRPC();
    
    console.log('\n🎉 All tests passed! Backend is working correctly.');
  } catch (error) {
    console.log('\n❌ Tests failed:', error.message);
    console.log('\n💡 Make sure to start the backend first:');
    console.log('   node start-backend-simple-cjs.js');
    process.exit(1);
  }
}

runTests();