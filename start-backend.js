#!/usr/bin/env node

const { spawn } = require('child_process');
const { writeFileSync, existsSync } = require('fs');
const net = require('net');
const path = require('path');

console.log('🚀 Backend Startup Script');
console.log('📁 Working directory:', process.cwd());

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

// Function to kill processes on specific ports
function killPortProcesses(ports) {
  return new Promise((resolve) => {
    const killCommands = ports.map(port => 
      `lsof -ti:${port} | xargs -r kill -9 2>/dev/null || true`
    ).join(' && ');
    
    if (killCommands) {
      const killProcess = spawn('bash', ['-c', killCommands], { stdio: 'pipe' });
      killProcess.on('close', () => {
        console.log('✅ Cleaned up existing processes');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Function to set environment variable
function setEnvVar(key, value) {
  try {
    const envContent = `${key}=${value}\n`;
    writeFileSync('.env.local', envContent);
    console.log(`📝 Set ${key}=${value} in .env.local`);
  } catch (error) {
    console.log(`⚠️ Could not write .env.local: ${error.message}`);
  }
}

async function startBackend() {
  try {
    // Clean up existing processes
    console.log('🧹 Cleaning up existing processes...');
    await killPortProcesses([3001, 3002, 3003, 3004, 3005, 8080]);
    
    // Find available port
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort(3001);
    console.log(`✅ Found available port: ${port}`);
    
    // Set environment variable for frontend
    setEnvVar('EXPO_PUBLIC_BACKEND_PORT', port);
    
    // Start backend using bun directly with the TypeScript file
    console.log(`🚀 Starting backend on port ${port}...`);
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    console.log('📁 Backend path:', backendPath);
    
    // Check if backend file exists
    if (!existsSync(backendPath)) {
      throw new Error(`Backend file not found: ${backendPath}`);
    }
    
    const backendProcess = spawn('bun', [backendPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port.toString(),
        AUTO_START_SERVER: 'true'
      }
    });
    
    console.log('✅ Backend startup script running...');
    console.log('💡 Press Ctrl+C to stop the server');
    
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
    
    backendProcess.on('close', (code) => {
      console.log(`🛑 Backend process exited with code ${code}`);
      process.exit(code || 0);
    });
    
    backendProcess.on('error', (error) => {
      console.error('❌ Backend process error:', error.message);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start backend:', error.message);
    process.exit(1);
  }
}

startBackend();