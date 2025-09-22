#!/usr/bin/env node

const http = require('http');

console.log('🔍 Testing backend connections...');

// Function to test a port
function testPort(port) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      timeout: 3000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ Port ${port} is working:`, parsed.message || parsed.status);
          resolve(true);
        } catch (error) {
          console.log(`⚠️ Port ${port} responded but not with JSON:`, data.substring(0, 100));
          resolve(true);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Port ${port} failed:`, error.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏰ Port ${port} timed out`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Function to test tRPC endpoint
function testTRPC(port) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/api/trpc/health?input=%7B%22json%22%3Anull%7D',
      method: 'GET',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ tRPC on port ${port} is working:`, parsed.result?.data || 'OK');
          resolve(true);
        } catch (error) {
          console.log(`⚠️ tRPC on port ${port} responded but parsing failed:`, data.substring(0, 100));
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ tRPC on port ${port} failed:`, error.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏰ tRPC on port ${port} timed out`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function testBackend() {
  const ports = [3001, 3002, 3003, 3004, 3005];
  let workingPort = null;

  // Test basic HTTP endpoints
  for (const port of ports) {
    console.log(`\n📡 Testing port ${port}...`);
    const isWorking = await testPort(port);
    if (isWorking) {
      workingPort = port;
      break;
    }
  }

  if (workingPort) {
    console.log(`\n🎯 Testing tRPC on port ${workingPort}...`);
    await testTRPC(workingPort);
    console.log(`\n✅ Backend is working on port ${workingPort}`);
    console.log(`🌐 Backend URL: http://localhost:${workingPort}`);
    console.log(`🔗 tRPC URL: http://localhost:${workingPort}/api/trpc`);
  } else {
    console.log('\n❌ No working backend found on any port');
    console.log('💡 Try running: node start-backend.js');
  }
}

testBackend();