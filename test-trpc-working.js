#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing tRPC connection...');

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

async function testTRPCConnection() {
  const port = getBackendPort();
  console.log(`📝 Testing tRPC on port ${port}...`);
  
  try {
    // Test health endpoint first
    const healthUrl = `http://localhost:${port}/`;
    console.log(`🔗 Testing health endpoint: ${healthUrl}`);
    
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!healthResponse.ok) {
      console.log(`❌ Health endpoint failed: ${healthResponse.status} ${healthResponse.statusText}`);
      return false;
    }
    
    const healthData = await healthResponse.json();
    console.log(`✅ Health endpoint working:`, healthData.message);
    
    // Test tRPC health endpoint
    const trpcUrl = `http://localhost:${port}/api/trpc/health?input=%7B%22json%22%3Anull%7D`;
    console.log(`🔗 Testing tRPC endpoint: ${trpcUrl}`);
    
    const trpcResponse = await fetch(trpcUrl, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!trpcResponse.ok) {
      console.log(`❌ tRPC endpoint failed: ${trpcResponse.status} ${trpcResponse.statusText}`);
      const responseText = await trpcResponse.text();
      console.log('Response body:', responseText.substring(0, 300));
      return false;
    }
    
    const trpcData = await trpcResponse.json();
    console.log(`✅ tRPC endpoint working:`, trpcData.result?.data?.message || 'OK');
    
    // Test ping endpoint
    const pingUrl = `http://localhost:${port}/api/trpc/ping?input=%7B%22json%22%3Anull%7D`;
    console.log(`🔗 Testing tRPC ping: ${pingUrl}`);
    
    const pingResponse = await fetch(pingUrl, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (pingResponse.ok) {
      const pingData = await pingResponse.json();
      console.log(`✅ tRPC ping working:`, pingData.result?.data?.message || 'pong');
    } else {
      console.log(`⚠️ tRPC ping failed: ${pingResponse.status}`);
    }
    
    console.log(`\n🎉 tRPC connection test successful!`);
    console.log(`🔗 Backend URL: http://localhost:${port}`);
    console.log(`🔗 tRPC URL: http://localhost:${port}/api/trpc`);
    console.log(`🔗 Health check: http://localhost:${port}/`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ tRPC connection test failed:`, error.message);
    console.error(`💡 Make sure the backend is running: node start-backend-working.js`);
    return false;
  }
}

testTRPCConnection().catch(console.error);