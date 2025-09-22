#!/usr/bin/env node

const net = require('net');

console.log('🔍 Testing backend connections...');

// Function to check if port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close();
      resolve(false); // Port is available (not in use)
    });
    server.on('error', () => {
      resolve(true); // Port is in use
    });
  });
}

// Function to test HTTP connection
async function testHttpConnection(port) {
  try {
    const response = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Port ${port} is working:`, data.message || 'Backend is running');
      return true;
    } else {
      console.log(`❌ Port ${port} responded with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Connection failed on port ${port}:`, error.message);
    return false;
  }
}

async function testBackend() {
  const ports = [3001, 3002, 3003, 3004, 3005];
  let foundWorking = false;
  
  for (const port of ports) {
    console.log(`\n📡 Testing port ${port}...`);
    
    const inUse = await isPortInUse(port);
    if (!inUse) {
      console.log(`❌ Port ${port} is not in use`);
      continue;
    }
    
    const working = await testHttpConnection(port);
    if (working) {
      foundWorking = true;
      console.log(`🎯 Found working backend on port ${port}`);
      
      // Test tRPC endpoint
      try {
        const trpcResponse = await fetch(`http://localhost:${port}/api/trpc/health?input=%7B%22json%22%3Anull%7D`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000),
        });
        
        if (trpcResponse.ok) {
          console.log(`✅ tRPC endpoint is working on port ${port}`);
        } else {
          console.log(`⚠️ tRPC endpoint returned status ${trpcResponse.status}`);
        }
      } catch (error) {
        console.log(`⚠️ tRPC endpoint test failed:`, error.message);
      }
      
      break;
    }
  }
  
  if (!foundWorking) {
    console.log('\n❌ No working backend found on any port');
    console.log('💡 Try running: node start-backend-simple-clean.js');
  } else {
    console.log('\n🎉 Backend is running and accessible!');
  }
}

testBackend();