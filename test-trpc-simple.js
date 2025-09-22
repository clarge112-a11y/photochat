#!/usr/bin/env node

// Add fetch polyfill for Node.js < 18
if (!globalThis.fetch) {
  try {
    const { fetch, Headers, Request, Response } = require('undici');
    globalThis.fetch = fetch;
    globalThis.Headers = Headers;
    globalThis.Request = Request;
    globalThis.Response = Response;
  } catch (_error) {
    console.error('❌ fetch is not available. Please install undici: npm install undici');
    process.exit(1);
  }
}

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing tRPC connection...');

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

// Test basic backend health
async function testBackend(port) {
  try {
    console.log(`📡 Testing backend on port ${port}...`);
    
    const response = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Backend is running:`, data.message);
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

// Test tRPC health endpoint with proper encoding
async function testTRPCHealth(port) {
  try {
    console.log(`🔗 Testing tRPC health endpoint on port ${port}...`);
    
    // Properly encode the input parameter
    const input = encodeURIComponent(JSON.stringify({ json: null }));
    const url = `http://localhost:${port}/api/trpc/health?input=${input}`;
    
    console.log(`📡 Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ tRPC health check successful:`, data);
      return true;
    } else {
      console.log(`❌ tRPC health check failed with status ${response.status}`);
      const text = await response.text();
      console.log('Response body:', text.substring(0, 300));
      return false;
    }
  } catch (error) {
    console.log(`❌ tRPC health check error:`, error.message);
    return false;
  }
}

// Test tRPC ping endpoint
async function testTRPCPing(port) {
  try {
    console.log(`🏓 Testing tRPC ping endpoint on port ${port}...`);
    
    const input = encodeURIComponent(JSON.stringify({ json: null }));
    const url = `http://localhost:${port}/api/trpc/ping?input=${input}`;
    
    console.log(`📡 Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ tRPC ping successful:`, data);
      return true;
    } else {
      console.log(`❌ tRPC ping failed with status ${response.status}`);
      const text = await response.text();
      console.log('Response body:', text.substring(0, 300));
      return false;
    }
  } catch (error) {
    console.log(`❌ tRPC ping error:`, error.message);
    return false;
  }
}

// Test tRPC debug endpoint
async function testTRPCDebug(port) {
  try {
    console.log(`🔍 Testing tRPC debug endpoint on port ${port}...`);
    
    const url = `http://localhost:${port}/test-trpc`;
    
    console.log(`📡 Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ tRPC debug successful:`, data);
      return true;
    } else {
      console.log(`❌ tRPC debug failed with status ${response.status}`);
      const text = await response.text();
      console.log('Response body:', text.substring(0, 300));
      return false;
    }
  } catch (error) {
    console.log(`❌ tRPC debug error:`, error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  const port = getBackendPort();
  
  console.log(`\n🚀 Testing backend on port ${port}`);
  
  // Test basic backend
  const backendWorking = await testBackend(port);
  
  if (!backendWorking) {
    console.log('\n❌ Backend is not running. Please start it first.');
    console.log('💡 Try running: node start-backend-ultimate.js');
    return;
  }
  
  console.log('\n🔗 Testing tRPC endpoints...');
  
  // Test tRPC debug endpoint first
  await testTRPCDebug(port);
  
  // Test tRPC health endpoint
  const healthWorking = await testTRPCHealth(port);
  
  // Test tRPC ping endpoint
  const pingWorking = await testTRPCPing(port);
  
  if (healthWorking || pingWorking) {
    console.log('\n✅ tRPC is working!');
    console.log(`🌐 Backend URL: http://localhost:${port}`);
    console.log(`🔗 tRPC URL: http://localhost:${port}/api/trpc`);
  } else {
    console.log('\n❌ tRPC endpoints are not working');
    console.log('💡 Check backend logs for errors');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});