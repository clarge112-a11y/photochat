#!/usr/bin/env node

// Test script to verify tRPC connection after fixes
console.log('🔍 Testing tRPC Connection After Fixes');

// Polyfill fetch for Node.js
if (typeof fetch === 'undefined') {
  try {
    const { fetch: nodeFetch } = require('undici');
    global.fetch = nodeFetch;
    console.log('✅ fetch polyfilled with undici');
  } catch (error) {
    console.error('❌ Failed to polyfill fetch:', error.message);
    process.exit(1);
  }
}

// Read backend port from .env.local
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
let backendPort = '3001';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const portMatch = envContent.match(/EXPO_PUBLIC_BACKEND_PORT=(\d+)/);
  if (portMatch) {
    backendPort = portMatch[1];
    console.log(`📝 Found backend port in .env.local: ${backendPort}`);
  }
}

const BASE_URL = `http://localhost:${backendPort}`;

async function testEndpoint(url, description) {
  if (!url || !url.trim()) {
    console.log(`   ❌ ${description} - ERROR: Invalid URL`);
    return false;
  }
  
  try {
    console.log(`\n🔍 Testing ${description}:`);
    console.log(`   URL: ${url}`);
    
    // Sanitize URL for safety
    const sanitizedUrl = url.trim();
    if (sanitizedUrl.length > 500) {
      console.log(`   ❌ ${description} - ERROR: URL too long`);
      return false;
    }
    
    const response = await fetch(sanitizedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-trpc-source': 'test-script'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ ${description} - SUCCESS`);
      if (data.result?.data) {
        console.log(`   Response:`, JSON.stringify(data.result.data, null, 2));
      } else {
        console.log(`   Response:`, JSON.stringify(data, null, 2));
      }
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ ${description} - FAILED (${response.status})`);
      console.log(`   Error:`, errorText.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${description} - ERROR: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing tRPC Fixes');
  console.log('='.repeat(50));
  
  const tests = [
    // Basic health checks
    [`${BASE_URL}/`, 'Basic Health Check'],
    [`${BASE_URL}/health`, 'Health Endpoint'],
    [`${BASE_URL}/api/health`, 'API Health Endpoint'],
    
    // tRPC endpoints - Primary (/api/trpc)
    [`${BASE_URL}/api/trpc/health?input=%7B%22json%22%3Anull%7D`, 'tRPC Health (Primary)'],
    [`${BASE_URL}/api/trpc/ping?input=%7B%22json%22%3Anull%7D`, 'tRPC Ping (Primary)'],
    
    // tRPC endpoints - Legacy (/trpc)
    [`${BASE_URL}/trpc/health?input=%7B%22json%22%3Anull%7D`, 'tRPC Health (Legacy)'],
    [`${BASE_URL}/trpc/ping?input=%7B%22json%22%3Anull%7D`, 'tRPC Ping (Legacy)'],
    
    // Debug endpoints
    [`${BASE_URL}/test-trpc`, 'tRPC Router Test'],
    [`${BASE_URL}/debug/routes`, 'Debug Routes']
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const [url, description] of tests) {
    const success = await testEndpoint(url, description);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS:');
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! tRPC is working correctly.');
    console.log('💡 You can now use the app - the backend should be working.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some tests failed. Check the backend configuration.');
    process.exit(1);
  }
}

// Check if backend is running first
async function checkBackend() {
  try {
    const response = await fetch(`${BASE_URL}/`, { 
      method: 'GET',
      timeout: 3000 
    });
    if (response.ok) {
      console.log(`✅ Backend is running on port ${backendPort}`);
      return true;
    }
  } catch (_error) {
    console.log(`❌ Backend is not running on port ${backendPort}`);
    console.log('💡 Start the backend first: node start-backend-working.js');
    return false;
  }
}

// Main execution
async function main() {
  const backendRunning = await checkBackend();
  if (!backendRunning) {
    process.exit(1);
  }
  
  await runTests();
}

main().catch((_error) => {
  console.error('Script failed to run');
  process.exit(1);
});