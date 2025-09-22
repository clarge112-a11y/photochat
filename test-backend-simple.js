#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing backend connections...');

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

// Test a specific port
async function testPort(port) {
  try {
    console.log(`📡 Testing port ${port}...`);
    
    // Test basic health endpoint
    const healthResponse = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`✅ Port ${port} is working:`, healthData.message);
      
      // Test tRPC endpoint
      try {
        const trpcResponse = await fetch(`http://localhost:${port}/api/trpc/health?input=%7B%22json%22%3Anull%7D`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        
        if (trpcResponse.ok) {
          const trpcData = await trpcResponse.json();
          console.log(`✅ tRPC on port ${port} is working:`, trpcData.result?.data?.message || 'OK');
          return { port, working: true, trpc: true };
        } else {
          console.log(`⚠️ tRPC on port ${port} responded with status ${trpcResponse.status}`);
          const responseText = await trpcResponse.text();
          console.log('Response body:', responseText.substring(0, 200));
          return { port, working: true, trpc: false };
        }
      } catch (trpcError) {
        console.log(`❌ tRPC on port ${port} failed:`, trpcError.message);
        return { port, working: true, trpc: false };
      }
    } else {
      console.log(`❌ Port ${port} responded with status ${healthResponse.status}`);
      return { port, working: false, trpc: false };
    }
  } catch (error) {
    console.log(`❌ Port ${port} is not accessible:`, error.message);
    return { port, working: false, trpc: false };
  }
}

async function main() {
  const configuredPort = getBackendPort();
  console.log(`📝 Found backend port in .env.local: ${configuredPort}`);
  
  const portsToTest = [configuredPort, 3001, 3002, 3003, 3004, 3005];
  const uniquePorts = [...new Set(portsToTest)];
  
  const results = [];
  for (const port of uniquePorts) {
    const result = await testPort(port);
    results.push(result);
  }
  
  const workingPorts = results.filter(r => r.working);
  const workingTrpcPorts = results.filter(r => r.working && r.trpc);
  
  if (workingTrpcPorts.length > 0) {
    console.log(`\n🎉 Found working backend with tRPC on port ${workingTrpcPorts[0].port}`);
    console.log(`🔗 Health check: http://localhost:${workingTrpcPorts[0].port}/`);
    console.log(`🔗 tRPC endpoint: http://localhost:${workingTrpcPorts[0].port}/api/trpc`);
  } else if (workingPorts.length > 0) {
    console.log(`\n⚠️ Found working backend on port ${workingPorts[0].port} but tRPC is not working`);
    console.log(`🔗 Health check: http://localhost:${workingPorts[0].port}/`);
    console.log(`🔧 Try restarting the backend: node start-backend-simple.js`);
  } else {
    console.log(`\n❌ No working backend found on any port`);
    console.log(`💡 Start the backend: node start-backend-simple.js`);
  }
}

main().catch(console.error);