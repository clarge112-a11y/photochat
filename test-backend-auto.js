import { createServer } from 'net';

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

// Function to find running backend port
async function findRunningBackend() {
  for (let port = 3001; port <= 3010; port++) {
    try {
      const response = await fetch(`http://localhost:${port}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Found running backend on port ${port}:`, data);
        return port;
      }
    } catch (error) {
      // Port not responding, continue checking
    }
  }
  return null;
}

async function testBackend() {
  console.log('🔍 Searching for running backend...');
  
  const runningPort = await findRunningBackend();
  
  if (!runningPort) {
    console.log('❌ No backend found running on ports 3001-3010');
    console.log('💡 Start the backend with: node start-backend-auto-port-fixed.js');
    process.exit(1);
  }
  
  console.log(`🎯 Testing tRPC connection on port ${runningPort}...`);
  
  try {
    const trpcResponse = await fetch(`http://localhost:${runningPort}/api/trpc/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (trpcResponse.ok) {
      const trpcData = await trpcResponse.json();
      console.log('✅ tRPC connection successful:', trpcData);
    } else {
      console.log('⚠️ tRPC endpoint responded with:', trpcResponse.status, trpcResponse.statusText);
    }
  } catch (error) {
    console.error('❌ tRPC connection failed:', error.message);
  }
  
  console.log(`\n📝 To connect frontend to this backend, set:`);
  console.log(`   EXPO_PUBLIC_BACKEND_PORT=${runningPort}`);
  console.log(`   or use: http://localhost:${runningPort}`);
}

testBackend();