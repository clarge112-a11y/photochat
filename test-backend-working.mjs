#!/usr/bin/env node

import fetch from 'node-fetch';

console.log('🔍 Testing backend connections...');

// Test multiple ports
const ports = [3001, 3002, 3003, 3004, 3005];

async function testPort(port) {
  try {
    console.log(`\n📡 Testing port ${port}...`);
    
    // Test basic health endpoint
    const healthResponse = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      timeout: 5000
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`✅ Health check passed on port ${port}:`, healthData);
      
      // Test tRPC endpoint
      try {
        const trpcResponse = await fetch(`http://localhost:${port}/api/trpc/health?input=%7B%22json%22%3Anull%7D`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          timeout: 5000
        });
        
        if (trpcResponse.ok) {
          const trpcData = await trpcResponse.json();
          console.log(`✅ tRPC test passed on port ${port}:`, trpcData);
          return { port, working: true, health: healthData, trpc: trpcData };
        } else {
          console.log(`⚠️ tRPC failed on port ${port}: ${trpcResponse.status} ${trpcResponse.statusText}`);
          return { port, working: false, error: `tRPC failed: ${trpcResponse.status}` };
        }
      } catch (trpcError) {
        console.log(`⚠️ tRPC error on port ${port}:`, trpcError.message);
        return { port, working: false, error: `tRPC error: ${trpcError.message}` };
      }
    } else {
      console.log(`❌ Health check failed on port ${port}: ${healthResponse.status} ${healthResponse.statusText}`);
      return { port, working: false, error: `Health check failed: ${healthResponse.status}` };
    }
  } catch (error) {
    console.log(`❌ Connection failed on port ${port}:`, error.message);
    return { port, working: false, error: error.message };
  }
}

async function main() {
  const results = [];
  
  for (const port of ports) {
    const result = await testPort(port);
    results.push(result);
  }
  
  console.log('\n📊 Test Results:');
  console.log('================');
  
  const workingPorts = results.filter(r => r.working);
  const failedPorts = results.filter(r => !r.working);
  
  if (workingPorts.length > 0) {
    console.log('\n✅ Working backends:');
    workingPorts.forEach(result => {
      console.log(`   Port ${result.port}: ✅ Working`);
    });
    
    console.log(`\n🎯 Use port ${workingPorts[0].port} for your frontend`);
    console.log(`   Set EXPO_PUBLIC_BACKEND_PORT=${workingPorts[0].port}`);
  } else {
    console.log('\n❌ No working backend found on any port');
    console.log('💡 Try running: node start-backend-working.mjs');
  }
  
  if (failedPorts.length > 0) {
    console.log('\n❌ Failed ports:');
    failedPorts.forEach(result => {
      console.log(`   Port ${result.port}: ${result.error}`);
    });
  }
}

main().catch(console.error);