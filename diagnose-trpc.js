#!/usr/bin/env node

// Add fetch polyfill for Node.js < 18
if (!globalThis.fetch) {
  try {
    const { fetch, Headers, Request, Response } = require('undici');
    globalThis.fetch = fetch;
    globalThis.Headers = Headers;
    globalThis.Request = Request;
    globalThis.Response = Response;
  } catch (error) {
    console.error('❌ fetch is not available. Please install undici: npm install undici');
    process.exit(1);
  }
}

const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive tRPC Diagnosis');

// Read port from .env.local
function getBackendPort() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/EXPO_PUBLIC_BACKEND_PORT=(\d+)/);
    return match ? parseInt(match[1]) : 3001;
  } catch (error) {
    console.log('📝 No .env.local found, using default port 3001');
    return 3001;
  }
}

async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    console.log(`\n🔗 Testing ${name}:`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-trpc-source': 'test-script'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`   Body: ${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}`);
    
    if (response.status === expectedStatus) {
      console.log(`   ✅ ${name} - SUCCESS`);
      return { success: true, data: responseText };
    } else {
      console.log(`   ❌ ${name} - FAILED (expected ${expectedStatus}, got ${response.status})`);
      return { success: false, error: `Status ${response.status}`, data: responseText };
    }
  } catch (error) {
    console.log(`   ❌ ${name} - ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  const port = getBackendPort();
  console.log(`📝 Using port: ${port}`);
  
  const baseUrl = `http://localhost:${port}`;
  
  const tests = [
    // Basic health checks
    { name: 'Basic Health', url: `${baseUrl}/`, expectedStatus: 200 },
    { name: 'Health Endpoint', url: `${baseUrl}/health`, expectedStatus: 200 },
    { name: 'API Health', url: `${baseUrl}/api/health`, expectedStatus: 200 },
    
    // tRPC router info
    { name: 'tRPC Router Test', url: `${baseUrl}/test-trpc`, expectedStatus: 200 },
    { name: 'API tRPC Router Test', url: `${baseUrl}/api/test-trpc`, expectedStatus: 200 },
    
    // Debug routes
    { name: 'Debug Routes', url: `${baseUrl}/debug/routes`, expectedStatus: 200 },
    
    // tRPC endpoints - different formats
    { name: 'tRPC Health (Simple)', url: `${baseUrl}/api/trpc/health`, expectedStatus: 200 },
    { name: 'tRPC Health (Query)', url: `${baseUrl}/api/trpc/health?input=%7B%22json%22%3Anull%7D`, expectedStatus: 200 },
    { name: 'tRPC Health (Full Query)', url: `${baseUrl}/api/trpc/health?input=%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D`, expectedStatus: 200 },
    
    // Legacy tRPC endpoints
    { name: 'Legacy tRPC Health', url: `${baseUrl}/trpc/health?input=%7B%22json%22%3Anull%7D`, expectedStatus: 200 },
    
    // tRPC ping
    { name: 'tRPC Ping', url: `${baseUrl}/api/trpc/ping?input=%7B%22json%22%3Anull%7D`, expectedStatus: 200 },
    
    // Other tRPC procedures
    { name: 'tRPC Test Database', url: `${baseUrl}/api/trpc/testDatabase?input=%7B%22json%22%3Anull%7D`, expectedStatus: 200 },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url, test.expectedStatus);
    results.push({ ...test, ...result });
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('=' .repeat(60));
  
  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Passed: ${passed.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failed.forEach(test => {
      console.log(`   ${test.name}: ${test.error}`);
    });
  }
  
  if (passed.length > 0) {
    console.log('\n✅ PASSED TESTS:');
    passed.forEach(test => {
      console.log(`   ${test.name}`);
    });
  }
  
  // Specific tRPC analysis
  console.log('\n🔍 tRPC ANALYSIS:');
  const trpcTests = results.filter(r => r.name.includes('tRPC'));
  const trpcPassed = trpcTests.filter(r => r.success);
  
  if (trpcPassed.length > 0) {
    console.log('✅ tRPC is working on these endpoints:');
    trpcPassed.forEach(test => {
      console.log(`   ${test.name}: ${test.url}`);
    });
  }
  
  const trpcFailed = trpcTests.filter(r => !r.success);
  if (trpcFailed.length > 0) {
    console.log('❌ tRPC failed on these endpoints:');
    trpcFailed.forEach(test => {
      console.log(`   ${test.name}: ${test.url} - ${test.error}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (failed.some(t => t.name === 'Basic Health')) {
    console.log('❌ Backend is not running. Start it with: node start-backend-clean.js');
  } else if (trpcFailed.length === trpcTests.length) {
    console.log('❌ All tRPC endpoints failed. Check tRPC server configuration.');
  } else if (trpcFailed.length > 0) {
    console.log('⚠️ Some tRPC endpoints failed. Check specific endpoint configurations.');
  } else {
    console.log('✅ All tests passed! tRPC should be working correctly.');
  }
}

main().catch(console.error);