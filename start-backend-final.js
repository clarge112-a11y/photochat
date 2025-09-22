#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

console.log('🚀 Backend Startup - Final Fix');
console.log('📁 Working directory:', process.cwd());

// Function to kill all processes on a port
function killPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, (error) => {
      // Ignore errors, just resolve
      setTimeout(resolve, 500); // Give it time to clean up
    });
  });
}

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    
    server.on('error', () => resolve(false));
  });
}

// Function to find available port
async function findAvailablePort() {
  const ports = [3001, 3002, 3003, 3004, 3005];
  
  // First, try to clean up all ports
  console.log('🧹 Cleaning up all ports...');
  for (const port of ports) {
    await killPort(port);
  }
  
  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Now find an available port
  for (const port of ports) {
    if (await isPortAvailable(port)) {
      console.log(`✅ Found available port: ${port}`);
      return port;
    }
  }
  
  throw new Error('No available ports found');
}

// Function to update .env.local
function updateEnvFile(port) {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = `EXPO_PUBLIC_BACKEND_PORT=${port}`;
  
  fs.writeFileSync(envPath, envContent);
  console.log(`📝 Set EXPO_PUBLIC_BACKEND_PORT=${port} in .env.local`);
}

// Function to test if backend is working
async function testBackend(port, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔍 Testing backend (attempt ${i + 1}/${maxRetries})...`);
      
      const response = await fetch(`http://localhost:${port}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Backend is working:`, data.message);
        return true;
      }
    } catch (error) {
      console.log(`⏳ Backend not ready yet (${error.message}), retrying...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
}

// Main function
async function startBackend() {
  try {
    // Find available port
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort();
    
    // Update environment file
    updateEnvFile(port);
    
    // Start the backend
    console.log(`🚀 Starting backend on port ${port}...`);
    
    // Set environment variable for the backend process
    const env = { 
      ...process.env, 
      PORT: port.toString(),
      NODE_ENV: 'development'
    };
    
    // Start backend using bun
    const backendProcess = spawn('bun', ['run', 'backend/hono.ts'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      cwd: process.cwd()
    });
    
    // Log backend output
    backendProcess.stdout.on('data', (data) => {
      console.log(`[BACKEND] ${data.toString().trim()}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
      console.error(`[BACKEND ERROR] ${data.toString().trim()}`);
    });
    
    console.log('✅ Backend process started, waiting for it to be ready...');
    
    // Test if backend is working
    const isWorking = await testBackend(port);
    
    if (isWorking) {
      console.log('\n🎉 Backend is fully operational!');
      console.log(`🌐 Backend URL: http://localhost:${port}`);
      console.log(`🔗 tRPC URL: http://localhost:${port}/api/trpc`);
      console.log('\n💡 Press Ctrl+C to stop the server');
      
      // Test tRPC endpoint
      try {
        const trpcResponse = await fetch(`http://localhost:${port}/test-trpc`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        
        if (trpcResponse.ok) {
          const trpcData = await trpcResponse.json();
          console.log('✅ tRPC router is accessible:', trpcData.message);
        }
      } catch (error) {
        console.log('⚠️  tRPC test failed:', error.message);
      }
      
    } else {
      console.error('❌ Backend failed to start properly');
      backendProcess.kill('SIGTERM');
      process.exit(1);
    }
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend...');
      backendProcess.kill('SIGTERM');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backend...');
      backendProcess.kill('SIGTERM');
      process.exit(0);
    });
    
    // Handle backend process exit
    backendProcess.on('close', (code) => {
      if (code !== 0) {
        console.log(`🛑 Backend process exited with code ${code}`);
      }
      process.exit(code || 0);
    });
    
    backendProcess.on('error', (error) => {
      console.error('🛑 Failed to start backend:', error.message);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('🛑 Backend startup failed:', error.message);
    process.exit(1);
  }
}

// Start the backend
startBackend();