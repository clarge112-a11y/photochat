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

// Simple test to verify tRPC client configuration
const { createTRPCProxyClient, httpBatchLink } = require('@trpc/client');
const superjson = require('superjson');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing tRPC Client Configuration');

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

async function testTRPCClient() {
  const port = getBackendPort();
  const baseUrl = `http://localhost:${port}`;
  const trpcUrl = `${baseUrl}/api/trpc`;
  
  console.log(`📝 Backend URL: ${baseUrl}`);
  console.log(`🔗 tRPC URL: ${trpcUrl}`);
  
  try {
    // Create a simple tRPC client
    const client = createTRPCProxyClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: trpcUrl,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-trpc-source': 'test-client'
          },
        }),
      ],
    });
    
    console.log('✅ tRPC client created successfully');
    
    // Test health procedure
    console.log('🔄 Testing health procedure...');
    const healthResult = await client.health.query();
    console.log('✅ Health procedure successful:', healthResult);
    
    // Test ping procedure
    console.log('🔄 Testing ping procedure...');
    const pingResult = await client.ping.query();
    console.log('✅ Ping procedure successful:', pingResult);
    
    console.log('\n🎉 All tRPC client tests passed!');
    
  } catch (error) {
    console.error('❌ tRPC client test failed:', error.message);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    
    // Try to diagnose the issue
    if (error.message.includes('Failed to fetch')) {
      console.error('💡 Network issue - backend may not be running');
    } else if (error.message.includes('No procedure found')) {
      console.error('💡 Procedure not found - check tRPC router configuration');
      console.error('💡 The error suggests the client is looking for the wrong path');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Request timeout - backend may be slow');
    }
  }
}

testTRPCClient();