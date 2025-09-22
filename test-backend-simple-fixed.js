#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('🔍 Testing backend connection...');

async function testConnection() {
  const ports = [3001, 3002, 3003, 3004, 3005];
  
  for (const port of ports) {
    try {
      console.log(`\n📡 Testing port ${port}...`);
      
      // Test if port is in use
      try {
        const { stdout } = await execAsync(`lsof -i:${port}`);
        if (stdout.trim()) {
          console.log(`✅ Port ${port} is in use`);
          
          // Test HTTP connection
          const response = await fetch(`http://localhost:${port}/`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ HTTP connection successful on port ${port}:`, data);
            
            // Test tRPC endpoint
            try {
              const trpcResponse = await fetch(`http://localhost:${port}/api/trpc/health?input=%7B%22json%22%3Anull%7D`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(3000),
              });
              
              if (trpcResponse.ok) {
                const trpcData = await trpcResponse.json();
                console.log(`✅ tRPC connection successful on port ${port}:`, trpcData);
                return port;
              } else {
                console.log(`❌ tRPC failed on port ${port}: ${trpcResponse.status}`);
              }
            } catch (trpcError) {
              console.log(`❌ tRPC error on port ${port}:`, trpcError.message);
            }
          } else {
            console.log(`❌ HTTP failed on port ${port}: ${response.status}`);
          }
        } else {
          console.log(`❌ Port ${port} is not in use`);
        }
      } catch (lsofError) {
        console.log(`❌ Port ${port} is not in use`);
      }
    } catch (error) {
      console.log(`❌ Connection failed on port ${port}:`, error.message);
    }
  }
  
  console.log('\n❌ No working backend found on any port');
  console.log('💡 Try running: node start-backend-simple-fixed.js');
  return null;
}

testConnection().then(port => {
  if (port) {
    console.log(`\n🎉 Backend is working on port ${port}`);
    process.exit(0);
  } else {
    console.log('\n💥 No working backend found');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});