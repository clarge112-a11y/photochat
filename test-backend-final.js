#!/usr/bin/env node

const http = require('http');

console.log('🔍 Testing backend connections...');

// Function to test a port
function testPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`✅ Port ${port} is working! Response:`, data.substring(0, 100));
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Connection failed on port ${port}: ${error.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ Timeout on port ${port}`);
      req.destroy();
      resolve(false);
    });
  });
}

async function testBackend() {
  const ports = [3001, 3002, 3003, 3004, 3005];
  
  for (const port of ports) {
    console.log(`\n📡 Testing port ${port}...`);
    const isWorking = await testPort(port);
    if (isWorking) {
      console.log(`🎉 Backend is running on port ${port}!`);
      console.log(`🔗 Health check: http://localhost:${port}/`);
      console.log(`🔗 tRPC endpoint: http://localhost:${port}/api/trpc`);
      console.log(`🔗 Debug routes: http://localhost:${port}/debug/routes`);
      return;
    }
  }
  
  console.log('\n❌ No working backend found on any port');
  console.log('💡 Try running: node start-backend-final-working.js');
}

testBackend();