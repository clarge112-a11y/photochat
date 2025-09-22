#!/usr/bin/env node

/**
 * Comprehensive Backend Fix Script
 * This script fixes all the tRPC connection issues by:
 * 1. Cleaning up any existing backend processes
 * 2. Starting a fresh backend server
 * 3. Testing the connection
 * 4. Providing detailed diagnostics
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

console.log('🔧 Comprehensive Backend Fix Script');
console.log('📁 Working directory:', process.cwd());

// Function to kill processes on specific ports
function killProcessOnPort(port) {
  return new Promise((resolve) => {
    const killProcess = spawn('lsof', ['-ti', `:${port}`]);
    let pids = '';
    
    killProcess.stdout.on('data', (data) => {
      pids += data.toString();
    });
    
    killProcess.on('close', (code) => {
      if (pids.trim()) {
        const pidList = pids.trim().split('\n');
        pidList.forEach(pid => {
          if (pid) {
            try {
              process.kill(parseInt(pid), 'SIGTERM');
              console.log(`✅ Killed process ${pid} on port ${port}`);
            } catch (error) {
              // Process might already be dead
            }
          }
        });
      }
      resolve();
    });
    
    killProcess.on('error', () => {
      // lsof might not be available or no processes found
      resolve();
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
async function findAvailablePort(startPort = 3001) {
  for (let port = startPort; port <= startPort + 10; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Function to update .env.local
function updateEnvFile(port) {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = `EXPO_PUBLIC_BACKEND_PORT=${port}\n`;
  fs.writeFileSync(envPath, envContent);
  console.log(`📝 Set EXPO_PUBLIC_BACKEND_PORT=${port} in .env.local`);
}

// Function to test backend connection
async function testBackendConnection(port, maxRetries = 10) {
  console.log(`🔍 Testing backend connection on port ${port}...`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`http://localhost:${port}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Backend is responding on port ${port}:`, data.message);
        return true;
      }
    } catch (error) {
      console.log(`⏳ Attempt ${attempt}/${maxRetries}: Backend not ready yet...`);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.log(`❌ Backend failed to respond after ${maxRetries} attempts`);
  return false;
}

// Function to test tRPC connection
async function testTRPCConnection(port) {
  console.log(`🔍 Testing tRPC connection on port ${port}...`);
  
  try {
    const response = await fetch(`http://localhost:${port}/api/trpc/health?input=%7B%22json%22%3Anull%7D`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ tRPC is working on port ${port}:`, data.result?.data?.message || 'OK');
      return true;
    } else {
      console.log(`❌ tRPC responded with status ${response.status}`);
      const responseText = await response.text();
      console.log('Response body:', responseText.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log(`❌ tRPC connection failed:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('\n🧹 Step 1: Cleaning up existing processes...');
    const portsToClean = [3001, 3002, 3003, 3004, 3005, 8080];
    for (const port of portsToClean) {
      await killProcessOnPort(port);
    }
    console.log('✅ Cleanup complete');
    
    console.log('\n🔍 Step 2: Finding available port...');
    const port = await findAvailablePort(3001);
    console.log(`✅ Found available port: ${port}`);
    
    console.log('\n📝 Step 3: Updating environment file...');
    updateEnvFile(port);
    console.log('✅ Environment updated');
    
    console.log('\n🚀 Step 4: Starting backend server...');
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    console.log(`📁 Backend path: ${backendPath}`);
    
    const backend = spawn('bun', ['run', '--hot', backendPath], {
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'development'
      }
    });

    // Log backend output
    backend.stdout.on('data', (data) => {
      console.log(`[BACKEND] ${data.toString().trim()}`);
    });
    
    backend.stderr.on('data', (data) => {
      console.error(`[BACKEND ERROR] ${data.toString().trim()}`);
    });
    
    console.log('✅ Backend startup initiated');
    
    console.log('\n⏳ Step 5: Waiting for backend to be ready...');
    const backendReady = await testBackendConnection(port);
    
    if (!backendReady) {
      console.log('❌ Backend failed to start properly');
      backend.kill('SIGTERM');
      process.exit(1);
    }
    
    console.log('\n🔍 Step 6: Testing tRPC connection...');
    const trpcReady = await testTRPCConnection(port);
    
    if (!trpcReady) {
      console.log('❌ tRPC is not working properly');
      console.log('💡 This might be a routing issue in the backend');
    }
    
    console.log('\n🎉 Backend Fix Complete!');
    console.log(`🔗 Backend URL: http://localhost:${port}`);
    console.log(`🔗 Health Check: http://localhost:${port}/`);
    console.log(`🔗 tRPC Endpoint: http://localhost:${port}/api/trpc`);
    console.log(`🔗 Debug Routes: http://localhost:${port}/debug/routes`);
    console.log('\n💡 You can now test the connection with: node test-backend-simple.js');
    console.log('💡 Or use the debug screen in your app to run comprehensive tests');
    console.log('\n🛑 Press Ctrl+C to stop the server');
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGTERM');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGTERM');
      process.exit(0);
    });
    
    backend.on('close', (code) => {
      if (code !== 0) {
        console.log(`🛑 Backend process exited with code ${code}`);
      }
      process.exit(code || 0);
    });
    
    backend.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Backend fix failed:', error.message);
    process.exit(1);
  }
}

main();