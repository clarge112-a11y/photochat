#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting backend and testing tRPC connection...');

// Function to find and kill processes on specific ports
async function killProcessOnPort(port) {
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
          try {
            process.kill(parseInt(pid), 'SIGTERM');
            console.log(`✅ Killed process ${pid} on port ${port}`);
          } catch (_error) {
            // Process might already be dead
          }
        });
      }
      resolve();
    });
    
    killProcess.on('error', () => {
      // lsof might not find anything, that's ok
      resolve();
    });
  });
}

// Function to update .env.local with the backend port
function updateEnvFile(port) {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = `EXPO_PUBLIC_BACKEND_PORT=${port}\n`;
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log(`📝 Updated .env.local with port ${port}`);
  } catch (error) {
    console.error('❌ Failed to update .env.local:', error.message);
  }
}

// Function to start the backend
async function startBackend() {
  console.log('🧹 Cleaning up existing processes...');
  
  // Kill processes on common ports
  const ports = [3001, 3002, 3003, 3004, 3005];
  for (const port of ports) {
    await killProcessOnPort(port);
  }
  
  // Use port 3001
  const port = 3001;
  updateEnvFile(port);
  
  console.log(`🚀 Starting backend on port ${port}...`);
  
  // Start the backend using bun
  const backendProcess = spawn('bun', ['run', 'backend/hono.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port.toString(),
    }
  });
  
  // Wait a bit for the backend to start
  await new Promise(resolve => {
    if (typeof resolve === 'function') {
      setTimeout(resolve, 3000);
    }
  });
  
  return backendProcess;
}

// Function to test the connection
async function testConnection() {
  console.log('🔍 Testing backend connection...');
  
  try {
    const { testBackendHealth, testTRPCConnection } = require('./test-trpc-connection.js');
    
    const backendHealthy = await testBackendHealth();
    if (!backendHealthy) {
      console.error('💥 Backend health check failed');
      return false;
    }
    
    const trpcHealthy = await testTRPCConnection();
    if (!trpcHealthy) {
      console.error('💥 tRPC connection test failed');
      return false;
    }
    
    console.log('🎉 All connection tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Connection test error:', error.message);
    return false;
  }
}

async function main() {
  try {
    // Start the backend
    const backendProcess = await startBackend();
    
    // Test the connection
    const connectionWorking = await testConnection();
    
    if (connectionWorking) {
      console.log('✅ Backend is running and tRPC is working!');
      console.log('💡 You can now start your Expo app');
      console.log('💡 Press Ctrl+C to stop the backend');
      
      // Keep the process running
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping backend...');
        backendProcess.kill('SIGTERM');
        process.exit(0);
      });
      
      // Wait for backend process to exit
      backendProcess.on('exit', (code) => {
        const exitCode = typeof code === 'number' ? code : 0;
        console.log(`🛑 Backend process exited with code ${exitCode}`);
        process.exit(exitCode);
      });
      
    } else {
      console.error('💥 Backend or tRPC connection failed');
      backendProcess.kill('SIGTERM');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Failed to start backend:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}