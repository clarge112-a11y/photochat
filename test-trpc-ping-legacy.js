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

console.log('🔍 Testing tRPC Ping (Legacy):');

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

async function testTRPCPingLegacy() {
  const port = getBackendPort();
  const url = `http://localhost:${port}/trpc/ping?input=%7B%22json%22%3Anull%7D`;
  
  try {
    console.log(`📡 Testing legacy tRPC ping: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-trpc-source': 'test-script'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Legacy tRPC ping successful:', data);
      return true;
    } else {
      console.log('❌ Legacy tRPC ping failed');
      const text = await response.text();
      console.log('Response body:', text.substring(0, 300));
      return false;
    }
  } catch (error) {
    console.error('❌ Legacy tRPC ping error:', error.message);
    return false;
  }
}

testTRPCPingLegacy().then(success => {
  if (success) {
    console.log('\n✅ Legacy tRPC ping is working!');
  } else {
    console.log('\n❌ Legacy tRPC ping failed');
  }
}).catch(error => {
  console.error('❌ Test failed:', error.message);
});