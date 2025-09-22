#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Quick Backend Test');

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

// Test basic backend
async function testBasicBackend(port) {
  try {
    console.log(`📡 Testing basic backend on port ${port}...`);
    
    const response = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Backend is running:`, data);
      return true;
    } else {
      console.log(`❌ Backend responded with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Backend connection failed:`, error.message);
    return false;
  }
}

// Test tRPC debug endpoint
async function testTRPCDebug(port) {
  try {
    console.log(`🔍 Testing tRPC debug endpoint on port ${port}...`);
    
    const response = await fetch(`http://localhost:${port}/test-trpc`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ tRPC debug successful:`, data);
      return true;
    } else {
      console.log(`❌ tRPC debug failed with status ${response.status}`);
      const text = await response.text();
      console.log('Response body:', text.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log(`❌ tRPC debug error:`, error.message);
    return false;
  }
}

// Test tRPC health with POST method (as tRPC typically uses POST)
async function testTRPCHealthPost(port) {
  try {
    console.log(`🏥 Testing tRPC health with POST on port ${port}...`);
    
    const response = await fetch(`http://localhost:${port}/api/trpc/health`, {
      method: 'POST',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ json: null }),
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ tRPC health POST successful:`, data);
      return true;
    } else {
      console.log(`❌ tRPC health POST failed with status ${response.status}`);
      const text = await response.text();
      console.log('Response body:', text.substring(0, 300));
      return false;
    }
  } catch (error) {
    console.log(`❌ tRPC health POST error:`, error.message);
    return false;
  }
}

// Main test function
async function runQuickTest() {
  const port = getBackendPort();
  
  console.log(`\n🚀 Testing backend on port ${port}`);
  
  // Test basic backend
  const backendWorking = await testBasicBackend(port);
  
  if (!backendWorking) {
    console.log('\n❌ Backend is not running. Please start it first.');
    console.log('💡 Try running: node start-backend-reliable.js');
    return;
  }
  
  // Test tRPC debug endpoint
  await testTRPCDebug(port);
  
  // Test tRPC health with POST
  await testTRPCHealthPost(port);
  
  console.log('\n🎯 Test complete!');
}

// Run the tests
runQuickTest().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});