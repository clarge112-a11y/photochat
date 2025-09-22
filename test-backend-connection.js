#!/usr/bin/env node

const net = require('net');

// Test if port is available
function testPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
      console.log(`✅ Port ${port} is in use (backend is running)`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(`❌ Port ${port} timeout`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      console.log(`❌ Port ${port} is not in use`);
      resolve(false);
    });
    
    socket.connect(port, 'localhost');
  });
}

// Test HTTP connection
async function testHTTP(port) {
  try {
    const response = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ HTTP test successful on port ${port}:`, data);
      return true;
    } else {
      console.log(`❌ HTTP test failed on port ${port}: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ HTTP test error on port ${port}:`, error.message);
    return false;
  }
}

// Test tRPC connection
async function testTRPC(port) {
  try {
    const response = await fetch(`http://localhost:${port}/api/trpc/health?input=%7B%22json%22%3Anull%7D`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ tRPC test successful on port ${port}:`, data);
      return true;
    } else {
      console.log(`❌ tRPC test failed on port ${port}: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ tRPC test error on port ${port}:`, error.message);
    return false;
  }
}

// Main test function
async function main() {
  console.log('🔍 Testing backend connections...');
  
  const ports = [3001, 3002, 3003, 3004, 3005];
  let workingPort = null;
  
  for (const port of ports) {
    console.log(`\n📡 Testing port ${port}...`);
    
    const portOpen = await testPort(port);
    if (!portOpen) {
      continue;
    }
    
    const httpWorks = await testHTTP(port);
    if (!httpWorks) {
      continue;
    }
    
    const trpcWorks = await testTRPC(port);
    if (trpcWorks) {
      workingPort = port;
      break;
    }
  }
  
  if (workingPort) {
    console.log(`\n✅ Backend is working on port ${workingPort}`);
    console.log(`🔗 Backend URL: http://localhost:${workingPort}`);
    console.log(`🔗 tRPC URL: http://localhost:${workingPort}/api/trpc`);
  } else {
    console.log('\n❌ No working backend found on any port');
    console.log('💡 Try running: node start-backend-clean.js');
  }
}

if (require.main === module) {
  main();
}

module.exports = { testPort, testHTTP, testTRPC };