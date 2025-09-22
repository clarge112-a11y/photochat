#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Backend Server');
console.log('📁 Working directory:', process.cwd());

// Function to kill processes on specific ports
async function killPortProcesses(ports) {
  for (const port of ports) {
    try {
      console.log(`🧹 Cleaning up port ${port}...`);
      
      // Kill processes using the port
      const killProcess = spawn('pkill', ['-f', `port.*${port}`], { stdio: 'ignore' });
      await new Promise(resolve => {
        killProcess.on('close', () => resolve());
        setTimeout(resolve, 1000); // Timeout after 1 second
      });
      
      // Also try lsof approach
      const lsofProcess = spawn('sh', ['-c', `lsof -ti:${port} | xargs kill -9 2>/dev/null || true`], { stdio: 'ignore' });
      await new Promise(resolve => {
        lsofProcess.on('close', () => resolve());
        setTimeout(resolve, 1000); // Timeout after 1 second
      });
      
    } catch (error) {
      // Ignore errors - port might not be in use
    }
  }
}

// Function to check if port is available
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const net = require('net');
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

// Main function
async function startBackend() {
  try {
    // Clean up existing processes
    console.log('🧹 Cleaning up existing processes...');
    await killPortProcesses([3001, 3002, 3003, 3004, 3005, 8080]);
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find available port
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort();
    
    // Update environment file
    updateEnvFile(port);
    
    // Start the backend
    console.log(`🚀 Starting backend on port ${port}...`);
    console.log('📁 Backend path:', path.join(process.cwd(), 'backend/hono.ts'));
    
    // Set environment variable for the backend process
    const env = { ...process.env, PORT: port.toString() };
    
    // Start backend using bun
    const backendProcess = spawn('bun', ['run', 'backend/hono.ts'], {
      stdio: 'inherit',
      env,
      cwd: process.cwd()
    });
    
    console.log('✅ Backend startup script running...');
    console.log('💡 Press Ctrl+C to stop the server');
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\\n🛑 Shutting down backend...');
      backendProcess.kill('SIGTERM');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\\n🛑 Shutting down backend...');
      backendProcess.kill('SIGTERM');
      process.exit(0);
    });
    
    // Handle backend process exit
    backendProcess.on('close', (code) => {
      if (code !== 0) {
        console.log(`🛑 Backend process exited with code ${code}`);
        process.exit(code);
      }
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