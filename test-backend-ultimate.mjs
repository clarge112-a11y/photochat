#!/usr/bin/env node

async function testBackend() {
  const ports = [3001, 3002, 3003, 3004, 3005];
  
  console.log('🔍 Testing backend connections...');
  
  for (const port of ports) {
    try {
      console.log(`\n📡 Testing port ${port}...`);
      
      // Test basic health endpoint
      const healthResponse = await fetch(`http://localhost:${port}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(5000),
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log(`✅ Health check successful on port ${port}:`, healthData);
        
        // Test tRPC endpoint
        try {
          const trpcResponse = await fetch(`http://localhost:${port}/api/trpc/health`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
            },
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(5000),
          });
          
          if (trpcResponse.ok) {
            const trpcData = await trpcResponse.json();
            console.log(`✅ tRPC test successful on port ${port}:`, trpcData);
            
            console.log(`\n🎉 Backend is working on port ${port}!`);
            console.log(`🌐 Health endpoint: http://localhost:${port}/`);
            console.log(`🔧 tRPC endpoint: http://localhost:${port}/api/trpc`);
            console.log(`📋 Debug routes: http://localhost:${port}/debug/routes`);
            
            return port;
          } else {
            console.log(`⚠️  tRPC test failed on port ${port}: ${trpcResponse.status} ${trpcResponse.statusText}`);
          }
        } catch (trpcError) {
          console.log(`⚠️  tRPC test error on port ${port}:`, trpcError.message);
        }
      } else {
        console.log(`❌ Health check failed on port ${port}: ${healthResponse.status} ${healthResponse.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Connection failed on port ${port}:`, error.message);
    }
  }
  
  console.log('\n❌ No working backend found on any port');
  console.log('💡 Try running: node start-backend-ultimate.mjs');
  return null;
}

testBackend().then(workingPort => {
  if (workingPort) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});