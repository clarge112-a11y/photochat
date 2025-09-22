#!/usr/bin/env node

// Simple tRPC connection test

// Polyfill fetch for Node.js
if (typeof fetch === 'undefined') {
  try {
    const { fetch } = require('undici');
    global.fetch = fetch;
    console.log('✅ Using undici fetch polyfill');
  } catch (error) {
    console.error('❌ Could not load fetch polyfill:', error.message);
    process.exit(1);
  }
}

async function testTRPCConnection() {
  console.log('🔍 Testing tRPC Connection');
  
  // Read port from .env.local
  const fs = require('fs');
  const path = require('path');
  
  let port = 3001;
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const portMatch = envContent.match(/EXPO_PUBLIC_BACKEND_PORT=(\d+)/);
    if (portMatch) {
      port = parseInt(portMatch[1]);
    }
  } catch (error) {
    console.log('ℹ️ Could not read .env.local, using default port 3001');
  }
  
  console.log(`📝 Using port: ${port}`);
  
  // Test basic health first
  console.log('\n🔗 Testing Basic Health:');
  const healthUrl = `http://localhost:${port}/`;
  console.log(`   URL: ${healthUrl}`);
  
  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   Status: 200 OK');
      console.log('   Response:', data);
      console.log('   ✅ Basic Health - SUCCESS');
    } else {
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log('   ❌ Basic Health - FAILED');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Basic Health Failed: ${error.message}`);
    return false;
  }
  
  // Test tRPC health using legacy endpoint (which works)
  console.log('\n🔗 Testing tRPC Health (Legacy):');
  const trpcHealthUrl = `http://localhost:${port}/trpc/health?input=%7B%22json%22%3Anull%7D`;
  console.log(`   URL: ${trpcHealthUrl}`);
  
  try {
    const response = await fetch(trpcHealthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   Status: 200 OK');
      console.log('   Response:', data);
      console.log('   ✅ tRPC Health (Legacy) - SUCCESS');
    } else {
      console.log(`   Status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log('   Response:', text.substring(0, 200));
      console.log('   ❌ tRPC Health (Legacy) - FAILED');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ tRPC Health (Legacy) Failed: ${error.message}`);
    return false;
  }
  
  // Test tRPC health using primary endpoint
  console.log('\n🔗 Testing tRPC Health (Primary):');
  const trpcPrimaryUrl = `http://localhost:${port}/api/trpc/health?input=%7B%22json%22%3Anull%7D`;
  console.log(`   URL: ${trpcPrimaryUrl}`);
  
  try {
    const response = await fetch(trpcPrimaryUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   Status: 200 OK');
      console.log('   Response:', data);
      console.log('   ✅ tRPC Health (Primary) - SUCCESS');
    } else {
      console.log(`   Status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log('   Response:', text.substring(0, 200));
      console.log('   ❌ tRPC Health (Primary) - FAILED');
    }
  } catch (error) {
    console.log(`   ❌ tRPC Health (Primary) Failed: ${error.message}`);
  }
  
  // Test tRPC ping
  console.log('\n🔗 Testing tRPC Ping:');
  const trpcPingUrl = `http://localhost:${port}/trpc/ping?input=%7B%22json%22%3Anull%7D`;
  console.log(`   URL: ${trpcPingUrl}`);
  
  try {
    const response = await fetch(trpcPingUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   Status: 200 OK');
      console.log('   Response:', data);
      console.log('   ✅ tRPC Ping - SUCCESS');
    } else {
      console.log(`   Status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log('   Response:', text.substring(0, 200));
      console.log('   ❌ tRPC Ping - FAILED');
    }
  } catch (error) {
    console.log(`   ❌ tRPC Ping Failed: ${error.message}`);
  }
  
  console.log('\n✅ tRPC connection test completed');
  return true;
}

// Check if backend is running first
async function checkBackend() {
  let port = 3001;
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const portMatch = envContent.match(/EXPO_PUBLIC_BACKEND_PORT=(\d+)/);
    if (portMatch) {
      port = parseInt(portMatch[1]);
    }
  } catch (error) {
    // Use default port
  }
  
  try {
    const response = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(2000),
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  const isBackendRunning = await checkBackend();
  
  if (!isBackendRunning) {
    console.log('❌ Backend is not running');
    console.log('💡 Start the backend first: node start-backend-simple-final.js');
    process.exit(1);
  }
  
  const success = await testTRPCConnection();
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});