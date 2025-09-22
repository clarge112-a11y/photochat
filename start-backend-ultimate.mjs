#!/usr/bin/env node

import { spawn } from 'child_process';
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

// Function to find available port
async function findAvailablePort(startPort = 3001) {
  for (let port = startPort; port <= startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Function to kill processes on port (cross-platform)
function killProcessOnPort(port) {
  return new Promise((resolve) => {
    // Try to find and kill process on port
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows command
      const findProcess = spawn('netstat', ['-ano']);
      let output = '';
      
      findProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      findProcess.on('close', () => {
        const lines = output.split('\n');
        const portLine = lines.find(line => line.includes(`:${port} `));
        
        if (portLine) {
          const pid = portLine.trim().split(/\s+/).pop();
          if (pid && pid !== '0') {
            console.log(`Killing process ${pid} on port ${port}`);
            spawn('taskkill', ['/F', '/PID', pid]);
          }
        }
        setTimeout(resolve, 1000);
      });
      
      findProcess.on('error', () => resolve());
    } else {
      // Unix/Linux/macOS command
      const killProcess = spawn('sh', ['-c', `lsof -ti:${port} | xargs kill -9`]);
      
      killProcess.on('close', () => {
        setTimeout(resolve, 1000);
      });
      
      killProcess.on('error', () => resolve());
    }
  });
}

async function startBackend() {
  try {
    console.log('🧹 Cleaning up existing processes...');
    
    // Kill processes on common ports
    const ports = [3001, 3002, 3003, 3004, 3005, 8080];
    for (const port of ports) {
      await killProcessOnPort(port);
    }
    
    // Wait a bit for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔍 Finding available port...');
    const availablePort = await findAvailablePort(3001);
    console.log(`✅ Found available port: ${availablePort}`);
    
    console.log(`🚀 Starting backend on port ${availablePort}...`);
    console.log(`📝 Setting EXPO_PUBLIC_BACKEND_PORT=${availablePort} for frontend`);
    
    // Start backend with bun
    const backend = spawn('bun', ['backend/hono.ts'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: availablePort.toString(),
        EXPO_PUBLIC_BACKEND_PORT: availablePort.toString(),
        NODE_ENV: 'development'
      },
      cwd: process.cwd()
    });
    
    backend.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      
      // Fallback to node if bun fails
      console.log('🔄 Trying with Node.js...');
      const nodeBackend = spawn('node', ['--loader', 'tsx', 'backend/hono.ts'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          PORT: availablePort.toString(),
          EXPO_PUBLIC_BACKEND_PORT: availablePort.toString(),
          NODE_ENV: 'development'
        },
        cwd: process.cwd()
      });
      
      nodeBackend.on('error', (nodeError) => {
        console.error('❌ Node.js fallback also failed:', nodeError.message);
        process.exit(1);
      });
      
      nodeBackend.on('exit', (code) => {
        console.log(`🛑 Node.js backend process exited with code ${code}`);
        process.exit(code || 0);
      });
    });
    
    backend.on('exit', (code) => {
      console.log(`🛑 Backend process exited with code ${code}`);
      process.exit(code || 0);
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGTERM');
      setTimeout(() => {
        backend.kill('SIGKILL');
        process.exit(0);
      }, 5000);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGTERM');
      setTimeout(() => {
        backend.kill('SIGKILL');
        process.exit(0);
      }, 5000);
    });
    
  } catch (error) {
    console.error('❌ Error starting backend:', error.message);
    process.exit(1);
  }
}

// Show usage info
console.log('🚀 Backend Startup Script');
console.log('📁 Working directory:', process.cwd());
console.log('🔧 This script will:');
console.log('   1. Kill any existing processes on ports 3001-3005, 8080');
console.log('   2. Find an available port');
console.log('   3. Start the backend server');
console.log('   4. Set EXPO_PUBLIC_BACKEND_PORT for the frontend');
console.log('');

startBackend();