#!/usr/bin/env node

// Comprehensive tRPC fix and test script
const fetch = require('node-fetch');

async function testTRPCEndpoints() {
  console.log('🔍 Testing all tRPC endpoints...');
  
  const baseUrl = 'http://localhost:3001';
  const endpoints = [
    '/api/trpc/health',
    '/trpc/health',
    '/api/trpc',
    '/trpc'
  ];
  
  const healthQuery = {
    json: null,
    meta: {
      values: ['undefined']
    }
  };
  
  const queryString = encodeURIComponent(JSON.stringify(healthQuery));
  
  for (const endpoint of endpoints) {
    const fullUrl = `${baseUrl}${endpoint}?input=${queryString}`;
    console.log(`\n📡 Testing: ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('   ✅ Success:', JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        console.log('   ❌ Error:', errorText.substring(0, 200));
      }
    } catch (error) {
      console.log('   ❌ Network Error:', error.message);
    }
  }
}

async function testBackendRoutes() {
  console.log('\n🔍 Testing backend routes...');
  
  const baseUrl = 'http://localhost:3001';
  const routes = [
    '/',
    '/health',
    '/api',
    '/api/health',
    '/test-trpc',
    '/api/test-trpc'
  ];
  
  for (const route of routes) {
    const fullUrl = `${baseUrl}${route}`;
    console.log(`\n📡 Testing: ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('   ✅ Success:', JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        console.log('   ❌ Error:', errorText.substring(0, 200));
      }
    } catch (error) {
      console.log('   ❌ Network Error:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 Comprehensive tRPC endpoint testing...');
  
  // Test basic backend routes first
  await testBackendRoutes();
  
  // Test tRPC endpoints
  await testTRPCEndpoints();
  
  console.log('\n🎯 Summary:');
  console.log('   - If /api/trpc/health works, the client should use /api/trpc as base URL');
  console.log('   - If /trpc/health works, the client should use /trpc as base URL');
  console.log('   - The client configuration in lib/trpc.ts should match the working endpoint');
}

if (require.main === module) {
  main().catch(console.error);
}