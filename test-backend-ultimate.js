#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing backend connections...');

// Function to get backend port from .env.local
function getBackendPort() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env.local not found, using default port 3001');
    return 3001;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^EXPO_PUBLIC_BACKEND_PORT=(\d+)$/m);
  
  if (match) {
    const port = parseInt(match[1]);
    console.log(`📝 Found backend port in .env.local: ${port}`);
    return port;
  }
  
  console.log('⚠️  EXPO_PUBLIC_BACKEND_PORT not found in .env.local, using default port 3001');
  return 3001;
}

// Function to test a specific port
async function testPort(port) {
  try {
    console.log(`📡 Testing port ${port}...`);
    
    const response = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Port ${port} is working:`, data.message);
      return true;
    } else {
      console.log(`❌ Port ${port} responded with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Port ${port} is not accessible:`, error.message);
    return false;
  }
}

// Function to test tRPC endpoint
async function testTRPC(port) {
  try {
    console.log(`🔗 Testing tRPC on port ${port}...`);
    
    const response = await fetch(`http://localhost:${port}/api/trpc/health?input=%7B%22json%22%3Anull%7D`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ tRPC on port ${port} is working:`, data);
      return true;
    } else {
      console.log(`❌ tRPC on port ${port} responded with status ${response.status}`);
      const text = await response.text();
      console.log('Response body:', text.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log(`❌ tRPC on port ${port} failed:`, error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  const configuredPort = getBackendPort();
  const testPorts = [configuredPort, 3001, 3002, 3003, 3004, 3005];
  
  // Remove duplicates
  const uniquePorts = [...new Set(testPorts)];
  
  let workingPort = null;
  
  // Test basic connectivity
  for (const port of uniquePorts) {
    const isWorking = await testPort(port);
    if (isWorking && !workingPort) {
      workingPort = port;
    }
  }
  
  if (workingPort) {
    console.log(`\n🎉 Found working backend on port ${workingPort}`);
    
    // Test tRPC
    const trpcWorking = await testTRPC(workingPort);
    
    if (trpcWorking) {
      console.log(`\n✅ Backend is fully functional on port ${workingPort}`);
      console.log(`🌐 Backend URL: http://localhost:${workingPort}`);
      console.log(`🔗 tRPC URL: http://localhost:${workingPort}/api/trpc`);
    } else {
      console.log(`\n⚠️  Backend is running on port ${workingPort} but tRPC is not working`);
    }
  } else {
    console.log(`\n❌ No working backend found on any port`);
    console.log('💡 Try running: node start-backend-ultimate.js');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});