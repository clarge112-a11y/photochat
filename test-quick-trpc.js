#!/usr/bin/env node

// Add fetch polyfill for Node.js < 18
if (!globalThis.fetch) {
  try {
    const { fetch, Headers, Request, Response } = require('undici');
    globalThis.fetch = fetch;
    globalThis.Headers = Headers;
    globalThis.Request = Request;
    globalThis.Response = Response;
    console.log('✅ Fetch polyfill loaded successfully');
  } catch (_error) {
    console.error('❌ fetch is not available. Please install undici: npm install undici');
    process.exit(1);
  }
} else {
  console.log('✅ Native fetch is available');
}

const fs = require('fs');
const path = require('path');

console.log('🔍 Quick tRPC Test');

// Read port from .env.local
function getBackendPort() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/EXPO_PUBLIC_BACKEND_PORT=(\d+)/);
    return match ? parseInt(match[1]) : 3001;
  } catch (_error) {
    console.log('📝 No .env.local found, using default port 3001');
    return 3001;
  }
}

async function quickTest() {
  const port = getBackendPort();
  const baseUrl = `http://localhost:${port}`;
  
  console.log(`📡 Testing backend on port ${port}...`);
  
  // Test 1: Basic health
  try {
    const healthResponse = await fetch(`${baseUrl}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('✅ Backend health:', data.message);
    } else {
      console.log('❌ Backend health failed:', healthResponse.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Backend not accessible:', error.message);
    return false;
  }
  
  // Test 2: Legacy tRPC health
  try {
    const input = encodeURIComponent(JSON.stringify({ json: null }));
    const legacyUrl = `${baseUrl}/trpc/health?input=${input}`;
    
    const legacyResponse = await fetch(legacyUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (legacyResponse.ok) {
      const data = await legacyResponse.json();
      console.log('✅ Legacy tRPC health:', data.result?.data?.message || 'OK');
    } else {
      console.log('❌ Legacy tRPC health failed:', legacyResponse.status);
    }
  } catch (error) {
    console.error('❌ Legacy tRPC health error:', error.message);
  }
  
  // Test 3: New tRPC health
  try {
    const input = encodeURIComponent(JSON.stringify({ json: null }));
    const newUrl = `${baseUrl}/api/trpc/health?input=${input}`;
    
    const newResponse = await fetch(newUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (newResponse.ok) {
      const data = await newResponse.json();
      console.log('✅ New tRPC health:', data.result?.data?.message || 'OK');
    } else {
      console.log('❌ New tRPC health failed:', newResponse.status);
      const text = await newResponse.text();
      console.log('Response:', text.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ New tRPC health error:', error.message);
  }
  
  return true;
}

quickTest().then(success => {
  if (success) {
    console.log('\n🎉 Quick test completed!');
    console.log('💡 If legacy tRPC is working but new tRPC is not, the backend configuration needs adjustment');
  } else {
    console.log('\n❌ Backend is not running');
    console.log('💡 Start the backend first: node start-backend-working.js');
  }
}).catch(error => {
  console.error('❌ Test failed:', error.message);
});