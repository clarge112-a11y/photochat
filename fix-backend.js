#!/usr/bin/env node

// Comprehensive backend fix script
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

console.log('🔧 Backend Fix Script');
console.log('====================');

// Step 1: Test if backend is already running
async function testBackendConnection() {
  console.log('\n📡 Step 1: Testing if backend is already running...');
  
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3003/', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Backend is already running!');
        console.log('📄 Response:', JSON.parse(data));
        resolve(true);
      });
    });
    
    req.on('error', () => {
      console.log('❌ Backend is not running');
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      console.log('⏰ Connection timeout - backend not running');
      resolve(false);
    });
  });
}

// Step 2: Start backend if not running
function startBackend() {
  console.log('\n🚀 Step 2: Starting backend...');
  
  const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
  console.log('📁 Backend path:', backendPath);
  
  const backend = spawn('bun', [backendPath], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '3003' },
    cwd: process.cwd()
  });

  backend.on('error', (error) => {
    console.error('❌ Failed to start backend with bun:', error.message);
    console.log('🔄 Trying with tsx...');
    
    // Fallback to tsx
    const backendTsx = spawn('npx', ['tsx', backendPath], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '3003' },
      cwd: process.cwd()
    });
    
    backendTsx.on('error', (tsxError) => {
      console.error('❌ Failed to start backend with tsx:', tsxError.message);
      console.error('💡 Please install bun or tsx:');
      console.error('   - Bun: curl -fsSL https://bun.sh/install | bash');
      console.error('   - tsx: npm install -g tsx');
      process.exit(1);
    });
  });

  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down backend...');
    backend.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down backend...');
    backend.kill('SIGTERM');
    process.exit(0);
  });

  return backend;
}

// Step 3: Test tRPC connection
async function testTRPCConnection() {
  console.log('\n🧪 Step 3: Testing tRPC connection...');
  
  // Wait a bit for backend to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3003/api/trpc/health', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ tRPC endpoint is working!');
        console.log('📄 Response status:', res.statusCode);
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ tRPC endpoint failed:', error.message);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log('⏰ tRPC connection timeout');
      resolve(false);
    });
  });
}

// Main execution
async function main() {
  try {
    // Test if backend is already running
    const isRunning = await testBackendConnection();
    
    if (!isRunning) {
      // Start backend
      const backend = startBackend();
      
      // Test tRPC connection
      const trpcWorking = await testTRPCConnection();
      
      if (trpcWorking) {
        console.log('\n🎉 Backend is now running and tRPC is working!');
        console.log('🌐 Backend URL: http://localhost:3003');
        console.log('🔗 tRPC URL: http://localhost:3003/api/trpc');
        console.log('💡 Your app should now be able to connect to the backend');
        console.log('🛑 Press Ctrl+C to stop the backend');
        
        // Keep the process alive
        setInterval(() => {}, 1000);
      } else {
        console.log('\n❌ Backend started but tRPC is not working');
        console.log('💡 Check the backend logs above for errors');
        process.exit(1);
      }
    } else {
      console.log('\n✅ Backend is already running - no action needed');
      console.log('🌐 Backend URL: http://localhost:3003');
      console.log('🔗 tRPC URL: http://localhost:3003/api/trpc');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Error in main execution:', error.message);
    process.exit(1);
  }
}

main();